const React = require("react");
const {StyleSheet, css} = require("aphrodite");

const FrameData = require("./data.js");

const controlHeightPx = 50;
const scrubberWidthPx = 10;
const seekWidthPx = 800;

// A bounding box is: [time, left, top, right, bottom]
const BoundingBoxT = React.PropTypes.arrayOf(React.PropTypes.number);

const SeekControl = React.createClass({
    propTypes: {
        keyFrameData: React.PropTypes.arrayOf(BoundingBoxT),
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

    onDrag: function(event) {
        let xInLocalCoords = event.clientX - controlHeightPx - 1;
        if (xInLocalCoords > seekWidthPx) {
            xInLocalCoords = seekWidthPx;
        } else if (xInLocalCoords < 0) {
            xInLocalCoords = 0;
        }
        const time = xInLocalCoords / seekWidthPx * this.props.videoDuration;
        this.props.modifyTime(time);
        return time;
    },

    onDragEnd: function(event) {
        const time = this.onDrag(event);
        this.props.modifyTime(time);
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
        keyFrameData: React.PropTypes.arrayOf(BoundingBoxT),
        modifyTime: React.PropTypes.func,
        playing: React.PropTypes.bool,
        setPlayingState: React.PropTypes.func,
        time: React.PropTypes.number,
        videoDuration: React.PropTypes.number,
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
                modifyTime={this.props.modifyTime}
                pauseCallback={this.pause}
                playing={this.props.playing}
                time={this.props.time}
                videoDuration={this.props.videoDuration}
            />
        </div>;
    },
});

const BoundingBox = React.createClass({
    propTypes: {
        data: React.PropTypes.arrayOf(BoundingBoxT),
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
            let frame = this.props.data.findIndex((elt) => elt[0] >= time) - 1;
            if (!frame || frame < 0) {frame = 0;}
            if (this.state.currentBoxIndex !== frame) {
                this.setState({currentBoxIndex: frame});
            }
        }
    },

    render: function() {
        const data = this.props.data[this.state.currentBoxIndex];
        const pos = {
            left: data[1],
            top: data[2],
            width: data[3] - data[1],
            height: data[4] - data[2],
        };
        return <div className={css(styles.boundingBox)} style={pos} />;

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
    deactivateInterval: function() {
        if (this.intervalID) {
            window.clearInterval(this.intervalID);
            this.intervalID = null;
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
    modifyTime: function(newTime) {
        this.setState({time: newTime});
        this.refs.video.currentTime = newTime;
    },
    render: function() {
        return <div className={css(styles.playerContainer)}>
            <video id="video" ref="video" src="video/AqMT_zB9rP8.mp4">
            </video>
            <BoundingBox
                data={this.state.frameData}
                time={this.state.time}
                videoDuration={(this.refs.video || {}).duration}
            />
            <ControlBar
                keyFrameData={this.state.frameData}
                modifyTime={this.modifyTime}
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

const styles = StyleSheet.create({
    boundingBox: {
        border: "2px solid white",
        position: "absolute",
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
    keyFrameControl: {
        backgroundColor: colors.kaGreen,
        bottom: 0,
        color: colors.kaGreen,
        height: 10,
        position: "absolute",
        width: 10,
    },
    playControl: {
        alignItems: "center",
        borderRight: "1px solid black",
        display: "flex",
        height: controlHeightPx,
        justifyContent: "center",
        marginRight: scrubberWidthPx / 2,
        width: controlHeightPx,
        ':active': {
            backgroundColor: colors.defaultTopicColor,
        },
        ':hover': {
            cursor: "pointer",
        },
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
        borderRight: "1px solid black",
        boxSizing: "border-box",
        height: controlHeightPx,
        paddingRight: scrubberWidthPx / 2,
        position: "relative",
        width: seekWidthPx,
    },
});

module.exports = Page;
