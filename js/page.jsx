const React = require("react");
const {StyleSheet, css} = require("aphrodite");

const FrameData = require("./data.js");

const controlHeightPx = 50;
const scrubberWidthPx = 10;
const seekWidthPx = 800;
const defaultRegionSizePx = 400;

// A bounding box is: [time, left, top, right, bottom]
const BoundingBoxT = React.PropTypes.arrayOf(React.PropTypes.number);

const findKeyFrameIndex = function(frameData, fractionalTime) {
    let frame = frameData.findIndex((elt) => elt[0] >= fractionalTime) - 1;
    if (!frame || frame < 0) {frame = 0;}
    return frame;
};

const SeekControl = React.createClass({
    propTypes: {
        keyFrameData: React.PropTypes.arrayOf(BoundingBoxT),
        modifyKeyFrameTime: React.PropTypes.func,
        modifyTime: React.PropTypes.func,
        pauseCallback: React.PropTypes.func.isRequired,
        playing: React.PropTypes.bool.isRequired,
        time: React.PropTypes.number,
        videoDuration: React.PropTypes.number,
    },
    getDefaultProps: function() {
        return {
            keyFrameData: [],
        };
    },

    xToTime: function(clientX) {
        let xInLocalCoords = clientX - controlHeightPx - 1;
        if (xInLocalCoords > seekWidthPx) {
            xInLocalCoords = seekWidthPx;
        } else if (xInLocalCoords < 0) {
            xInLocalCoords = 0;
        }
        return xInLocalCoords / seekWidthPx * this.props.videoDuration;
    },

    onDrag: function(event) {
        const time = this.xToTime(event.clientX);
        this.props.modifyTime(time);
        return time;
    },

    onDragEnd: function(event) {
        // TODO(colin): this appears not to work correctly unless I call
        // modifyTime this second time, which probably means I don't understand
        // something about drag events of setting the time in a video.
        const time = this.onDrag(event);
        this.props.modifyTime(time);
    },

    keyFrameControlDown: function(idx, event) {
        const control = this.refs[`keyframe${idx}`];
        const initialClientX = event.clientX;
        const initialPos = control.getBoundingClientRect().left;
        const xToTime = this.xToTime;
        this.listener = (event) => {
            if (this.props.videoDuration) {
                const newTime = xToTime(
                    event.clientX - initialClientX + initialPos);
                this.props.modifyKeyFrameTime(idx, newTime);
            }
        };
        control.addEventListener(
            "mousemove",
            this.listener);
    },

    keyFrameControlUp: function(idx, event) {
        const control = this.refs[`keyframe${idx}`];
        control.removeEventListener("mousemove", this.listener);
        delete this.initialClientX;
        delete this.initalPos;
        delete this.listener;
    },

    render: function() {
        let scrubberPosition = -scrubberWidthPx / 2;
        if (this.props.videoDuration) {
            scrubberPosition = (
                this.props.time / this.props.videoDuration * seekWidthPx -
                scrubberWidthPx / 2);
        }
        const keyFrameControls = this.props.keyFrameData.map((kf, i) => {
            return <div
                className={css(styles.keyFrameControl)}
                key={i}
                ref={`keyframe${i}`}
                onMouseDown={(event) => this.keyFrameControlDown(i, event)}
                onMouseLeave={(event) => this.keyFrameControlUp(i, event)}
                onMouseUp={(event) => this.keyFrameControlUp(i, event)}
                style={{left: kf[0] * seekWidthPx - 5}}
            />;
        });
        return <div className={css(styles.seeker)}>
            <div
                className={css(styles.scrubber)}
                draggable={true}
                onDrag={this.onDrag}
                onDragStart={this.props.pauseCallback}
                onDragEnd={this.onDragEnd}
                style={{left: scrubberPosition}}
            />
            {keyFrameControls}
        </div>;
    },
});

const ControlBar = React.createClass({
    propTypes: {
        addKeyFrame: React.PropTypes.func.isRequired,
        deleteKeyFrame: React.PropTypes.func.isRequired,
        keyFrameData: React.PropTypes.arrayOf(BoundingBoxT),
        modifyKeyFrameTime: React.PropTypes.func,
        modifyTime: React.PropTypes.func,
        playing: React.PropTypes.bool,
        setPlayingState: React.PropTypes.func,
        time: React.PropTypes.number,
        videoDuration: React.PropTypes.number,
    },
    addKeyFrame: function() {
        this.props.addKeyFrame(
            [this.props.time / this.props.videoDuration,
                0, 0, defaultRegionSizePx, defaultRegionSizePx]);
    },
    deleteKeyFrame: function() {
        this.props.deleteKeyFrame(this.props.time / this.props.videoDuration);
    },
    playPause: function() {
        if (this.props.playing) {
            this.props.setPlayingState(false);
        } else {
            this.props.setPlayingState(true);
        }
    },
    pause: function() {
        this.props.setPlayingState(false);
    },
    render: function() {
        return <div
            className={css(styles.controlBar)}
        >
            <div
                className={css(styles.playControl)}
                onClick={this.playPause}
            >
                {this.props.playing ?
                    <i className="material-icons">pause</i> :
                    <i className="material-icons">play_arrow</i>}
            </div>
            <SeekControl
                keyFrameData={this.props.keyFrameData}
                modifyKeyFrameTime={this.props.modifyKeyFrameTime}
                modifyTime={this.props.modifyTime}
                pauseCallback={this.pause}
                playing={this.props.playing}
                time={this.props.time}
                videoDuration={this.props.videoDuration}
            />
            <div
                className={css(styles.addKeyFrameControl)}
                onClick={this.addKeyFrame}
            >
                <i className="material-icons">add</i>
            </div>
            <div
                className={css(styles.deleteKeyFrameControl)}
                onClick={this.deleteKeyFrame}
            >
                <i className="material-icons">remove</i>
            </div>
        </div>;
    },
});

const BoundingBox = React.createClass({
    propTypes: {
        data: React.PropTypes.arrayOf(BoundingBoxT),
        modifyBox: React.PropTypes.func,
        time: React.PropTypes.number,
        videoDuration: React.PropTypes.number,
    },
    getInitialState: function() {
        return {currentBoxIndex: 0};
    },
    componentDidMount: function() {
        this.intervalID = window.setInterval(this.boundingBoxDraw, 200);
    },
    componentWillUnmount: function() {
        window.clearInterval(this.intervalID);
    },
    boundingBoxDraw: function() {
        if (this.props.videoDuration) {
            const time = this.props.time / this.props.videoDuration;
            const frame = findKeyFrameIndex(this.props.data, time);
            if (this.state.currentBoxIndex !== frame) {
                this.setState({currentBoxIndex: frame});
            }
        }
    },
    onMouseDown: function(event) {
        this.dragStartX = event.screenX;
        this.dragStartY = event.screenY;
        this.originalBoxPos = this.props.data[this.state.currentBoxIndex];
        this.refs.box.addEventListener("mousemove", this.onDrag);
    },
    onMouseUp: function(event) {
        delete this.dragStartX;
        delete this.dragStartY;
        delete this.originalBoxPos;
        this.refs.box.removeEventListener("mousemove", this.onDrag);
    },
    onDrag: function(event) {
        const data = this.originalBoxPos;
        const x = event.screenX - this.dragStartX + data[1];
        const y = event.screenY - this.dragStartY + data[2];
        const width = data[3] - data[1];
        const height = data[4] - data[2];
        const newBox = [data[0], x, y, x + width, y + height];
        this.props.modifyBox(
            this.state.currentBoxIndex,
            newBox);
    },
    render: function() {
        const data = this.props.data[this.state.currentBoxIndex];
        const pos = {
            left: data[1],
            top: data[2],
            width: data[3] - data[1],
            height: data[4] - data[2],
        };
        return <div
            className={css(styles.boundingBox)}
            onMouseUp={this.onMouseUp}
            onMouseDown={this.onMouseDown}
            ref="box"
            style={pos}
        />;

    },
});

const Page = React.createClass({
    getInitialState: function() {
        return {
            frameData: FrameData,
            playing: false,
            time: 0,
        };
    },
    componentDidMount: function() {
        if (this.state.playing) {
            this.activateInterval();
        }
    },
    componentDidUpdate: function() {
        if (this.state.playing && !this.intervalID) {
            this.activateInterval();
        } else if (!this.state.playing) {
            this.deactivateInterval();
        }
    },
    componentWillUnmount: function() {
        this.deactivateInterval();
    },
    activateInterval: function() {
        this.intervalID = window.setInterval(this.checkVideoProgress, 200);
    },
    addKeyFrame: function(newFrame) {
        const newFrameData = [newFrame, ...this.state.frameData];
        newFrameData.sort((frame0, frame1) => frame0[0] - frame1[0]);
        this.setState({frameData: newFrameData});
    },
    deactivateInterval: function() {
        if (this.intervalID) {
            window.clearInterval(this.intervalID);
            this.intervalID = null;
        }
    },
    deleteKeyFrame: function(fractionalTime) {
        const frame = findKeyFrameIndex(this.state.frameData, fractionalTime);
        if (frame > 0 && frame < this.state.frameData.length - 1) {
            const newFrameData = [
                ...this.state.frameData.slice(0, frame),
                ...this.state.frameData.slice(
                    frame + 1, this.state.frameData.length)];
            newFrameData.sort((frame0, frame1) => frame0[0] - frame1[0]);
            this.setState({frameData: newFrameData});
        }
    },
    checkVideoProgress: function() {
        if (this.state.playing) {
            this.setState({time: this.refs.video.currentTime});
        }
    },
    setPlaying: function(newValue) {
        this.setState({playing: newValue});
        if (newValue) {
            this.refs.video.play();
        } else {
            this.refs.video.pause();
        }
    },
    modifyBox: function(boxIndex, newBox) {
        const newFrameData = [...this.state.frameData];
        newFrameData[boxIndex] = newBox;
        this.setState({frameData: newFrameData});
    },
    modifyKeyFrameTime: function(keyFrameIndex, newTime) {
        const newFrameData = [...this.state.frameData];
        newFrameData[keyFrameIndex] = [...newFrameData[keyFrameIndex]];
        newFrameData[keyFrameIndex][0] = newTime / this.refs.video.duration;
        newFrameData.sort((frame0, frame1) => frame0[0] - frame1[0]);
        this.setState({frameData: newFrameData});
    },
    modifyTime: function(newTime) {
        this.setState({time: newTime});
        this.refs.video.currentTime = newTime;
    },
    render: function() {
        return <div className={css(styles.playerContainer)}>
            <video
                id="video"
                preload={true}
                ref="video"
                src="video/AqMT_zB9rP8.mp4"
            >
            </video>
            <BoundingBox
                data={this.state.frameData}
                modifyBox={this.modifyBox}
                time={this.state.time}
                videoDuration={(this.refs.video || {}).duration}
            />
            <ControlBar
                addKeyFrame={this.addKeyFrame}
                deleteKeyFrame={this.deleteKeyFrame}
                keyFrameData={this.state.frameData}
                modifyTime={this.modifyTime}
                modifyKeyFrameTime={this.modifyKeyFrameTime}
                playing={this.state.playing}
                setPlayingState={this.setPlaying}
                time={this.state.time}
                videoDuration={(this.refs.video || {}).duration}
            />
        </div>;
    },
});

const colors = {
    defaultSubjectColor: "#4d6779",
    defaultTopicColor: "#6a8da6",
    kaBlue: "#314453",
    kaGreen: "#639b24",
};

const button = {
    alignItems: "center",
    display: "flex",
    height: controlHeightPx,
    justifyContent: "center",
    width: controlHeightPx,
    ':active': {
        backgroundColor: colors.defaultTopicColor,
    },
    ':hover': {
        cursor: "pointer",
    },
};

const styles = StyleSheet.create({
    addKeyFrameControl: {
        borderLeft: "1px solid black",
        marginLeft: scrubberWidthPx / 2,
        borderRight: "1px solid black",
        ...button,
    },
    boundingBox: {
        border: "2px solid white",
        position: "absolute",
        ':hover': {
            cursor: "pointer",
        },
    },
    controlBar: {
        alignItems: "center",
        backgroundColor: colors.defaultSubjectColor,
        bottom: 0,
        display: "flex",
        height: controlHeightPx,
        justifyContent: "flex-start",
        left: 0,
        position: "absolute",
        width: "100%",
    },
    deleteKeyFrameControl: {
        borderRight: "1px solid black",
        ...button,
    },
    keyFrameControl: {
        backgroundColor: colors.kaGreen,
        bottom: 0,
        color: colors.kaGreen,
        height: 10,
        position: "absolute",
        width: 10,
        ':hover': {
            cursor: "pointer",
        },
    },
    playControl: {
        borderRight: "1px solid black",
        marginRight: scrubberWidthPx / 2,
        ...button,
    },
    playerContainer: {
        left: 0,
        position: "absolute",
        top: 0,
    },
    scrubber: {
        backgroundColor: colors.kaBlue,
        height: controlHeightPx,
        position: "absolute",
        top: 0,
        width: scrubberWidthPx,
        ':hover': {
            cursor: "pointer",
        },
    },
    seeker: {
        boxSizing: "border-box",
        height: controlHeightPx,
        position: "relative",
        width: seekWidthPx,
    },
});

module.exports = Page;
