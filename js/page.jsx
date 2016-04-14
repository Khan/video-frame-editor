const React = require("react");
const {StyleSheet, css} = require("aphrodite");

const FrameData = require("./data.js");

const fullWidthPx = 1024;
const videoHeightPx = 576;
const controlHeightPx = 50;
const scrubberWidthPx = 8;
const seekWidthPx = 874;

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

    onDrag: function(dx, dy, x, y) {
        const time = this.xToTime(x);
        this.props.modifyTime(time);
        return time;
    },

    render: function() {
        let scrubberPosition = -scrubberWidthPx / 2;
        if (this.props.videoDuration) {
            scrubberPosition = (
                this.props.time / this.props.videoDuration * seekWidthPx -
                scrubberWidthPx / 2);
        }
        let rightBefore = 0;

        this.props.keyFrameData.forEach((kf, i) => {
          if (kf[0] < (this.props.time / this.props.videoDuration)) {
            rightBefore = i;
          }
        })

        const keyFrameControls = this.props.keyFrameData.map((kf, i) => {
            return <Draggable
                className={css(styles.keyFrameControl, i === rightBefore && styles.keyFrameControlHighlighted)}
                key={i}
                onDragChange={(dx, dy, x, y) => {
                  const newTime = this.xToTime(x);
                  this.props.modifyKeyFrameTime(i, newTime);
                }}
                style={{left: kf[0] * seekWidthPx - 5}}
            />;
        });
        return <div className={css(styles.seeker)}>
            <Draggable
                className={css(styles.scrubber)}
                onDragChange={this.onDrag}
                onDragStart={this.props.pauseCallback}
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
      // We want to drop in a keyframe at the same position as the current keyframe - that'll help avoid jumpy data.
      const currentKeyframeIndex = findKeyFrameIndex(this.props.keyFrameData, this.props.time)
      const currentKeyFrame = this.props.keyFrameData[currentKeyframeIndex]
      const newKeyframe = [
        (this.props.time / this.props.videoDuration) - 0.0001, // this helps make the keyframe "the current keyframe" without noticable issue
        currentKeyFrame[1],
        currentKeyFrame[2],
        currentKeyFrame[3],
        currentKeyFrame[4]
      ]
        this.props.addKeyFrame(newKeyframe);
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
        return <div className={css(styles.controlBar)}>
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
              className={css(styles.deleteKeyFrameControl)}
              onClick={this.deleteKeyFrame}
            >
              <i className="material-icons">remove</i>
            </div>
            <div
              className={css(styles.addKeyFrameControl)}
              onClick={this.addKeyFrame}
            >
                <i className="material-icons">add</i>
            </div>
        </div>;
    },
});

const NavBar = React.createClass({
  propTypes: {
    videoIDs: React.PropTypes.arrayOf(React.PropTypes.string),
    currentVideoID: React.PropTypes.string,
    onVideoChange: React.PropTypes.func,
    onDiscardChanges: React.PropTypes.func,
    onSaveChanges: React.PropTypes.func,
  },
  render: function() {

    const allVideoIDsAsOptions = this.props.videoIDs.map(videoID => {
      return <option key={videoID} value={videoID}>{videoID}</option>
    })


    return <div className={css(styles.navBar)}>
      <div className={css(styles.navBarGroup)}>
        <div className={css(styles.navBarTitle)}>Choose Video:</div>
        <select
          className={css(styles.navBarSelect)}
          onChange={evt => this.props.onVideoChange(evt.target.value)}
          value={this.props.currentVideoID}>
            {allVideoIDsAsOptions}
        </select>
      </div>
      <div className={css(styles.navBarGroup)}>
        <button
          className={css(styles.navBarCancelButton)}
          onClick={this.props.onDiscardChanges}
          >
            Discard Changes
        </button>
        <button
          className={css(styles.navBarSaveButton)}
          onClick={this.props.onSaveChanges}
          >
            Save Changes
        </button>
      </div>
    </div>
  }
})

const Draggable = React.createClass({
    propTypes: {
      onDragChange: React.PropTypes.func.isRequired,
      onDragStart: React.PropTypes.func,
      style: React.PropTypes.object,
    },
    getInitialState() {
      return {startX: null, startY: null}
    },
    onMouseDown(event) {
      this.setState({
        startX: event.screenX,
        startY: event.screenY,
      })
      window.addEventListener("mousemove", this.onMouseMove)
      window.addEventListener("mouseup", this.onMouseUp)
      if (this.props.onDragStart) {
        this.props.onDragStart()
      }
    },
    onMouseMove(event) {
      const deltaX = event.screenX - this.state.startX;
      const deltaY = event.screenY - this.state.startY;
      this.props.onDragChange(deltaX, deltaY, event.screenX, event.screenY);
      this.setState({
        startX: event.screenX,
        startY: event.screenY,
      })
    },
    onMouseUp(event) {
      this.setState({
        startX: null,
        startY: null,
      })
      window.removeEventListener("mousemove", this.onMouseMove)
      window.removeEventListener("mouseup", this.onMouseUp)
    },
    render() {
      return <div
        onMouseDown={this.onMouseDown}
        className={this.props.className}
        style={this.props.style}
      >
          {this.props.children}
      </div>
    }
})

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
    onDrag(deltaX, deltaY) {
      const data = this.props.data[this.state.currentBoxIndex];
      const x = Math.max(data[1] + deltaX, 0);
      const y = Math.max(data[2] + deltaY, 0);
      const newBox = [data[0], x, y, x + (data[3] - data[1]), y + (data[4] - data[2]) ];
      this.props.modifyBox(
          this.state.currentBoxIndex,
          newBox);
    },
    onResizeDrag(deltaX, deltaY) {
      const data = this.props.data[this.state.currentBoxIndex];
      const width = Math.min(Math.max(data[3] - data[1] + deltaX, 40), fullWidthPx - data[1]);
      const height = Math.min(Math.max(data[4] - data[2] + deltaY, 40), videoHeightPx - data[2] - controlHeightPx);
      const newBox = [data[0], data[1], data[2], data[1] + width, data[2] + height];
      this.props.modifyBox(
        this.state.currentBoxIndex,
        newBox);
    },
    render: function() {
        const data = this.props.data[this.state.currentBoxIndex];
        const pos = {
            left: data[1],
            top: Math.max(data[2]+controlHeightPx, controlHeightPx),
            width: data[3] - data[1],
            height: data[4] - data[2],
        };
        return <div
          className={css(styles.boundingBox)}
          ref="box"
          style={pos}
          >
            <Draggable
              onDragChange={this.onDrag}
              className={css(styles.boundingBoxBackground)}
            >
            </Draggable>
            <Draggable
              onDragChange={this.onResizeDrag}
              className={css(styles.boundingBoxResize)}>
          </Draggable>
          </div>;

    },
});

const Page = React.createClass({
    propTypes: {
      currentVideoID: React.PropTypes.string.isRequired,
      initialFrameData: React.PropTypes.arrayOf(React.PropTypes.arrayOf(React.PropTypes.number)),
      onSave: React.PropTypes.func,
      videoIDs: React.PropTypes.arrayOf(React.PropTypes.string),
      setCurrentVideo: React.PropTypes.func,
    },
    getInitialState: function() {
        return {
            frameData: this.denormalizeFrameData(this.props.initialFrameData),
            playing: false,
            time: 0,
        };
    },
    denormalizeFrameData(frameData) {
      return frameData.map(data => {
        return [
          data[0],
          data[1] * fullWidthPx,
          data[2] * videoHeightPx,
          data[3] * fullWidthPx,
          data[4] * videoHeightPx
        ]
      })
    },
    normalizeFrameData(frameData) {
      return frameData.map(data => {
        return [
          data[0],
          data[1] / fullWidthPx,
          data[2] / videoHeightPx,
          data[3] / fullWidthPx,
          data[4] / videoHeightPx
        ]
      })
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
    onDiscardChanges() {
      this.setState({frameData: this.denormalizeFrameData(this.props.initialFrameData)})
    },
    onSaveChanges() {
      this.props.onSave(this.normalizeFrameData(this.state.frameData))
    },
    render: function() {
        return <div className={css(styles.playerContainer)}>
          <NavBar
            videoIDs={this.props.videoIDs}
            currentVideoID={this.props.currentVideoID}
            onVideoChange={this.props.setCurrentVideo}
            onDiscardChanges={this.onDiscardChanges}
            onSaveChanges={this.onSaveChanges}
            />
          <div className={css(styles.videoContainer)}>
            <video className={css(styles.videoPlayer)}
              id="video"
              preload={true}
              ref="video"
              src={"video/" + this.props.currentVideoID + ".mp4"}
            />
            <BoundingBox
              data={this.state.frameData}
              modifyBox={this.modifyBox}
              time={this.state.time}
              videoDuration={(this.refs.video || {}).duration}
            />
          </div>
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
    whiteColor: "#FFFFFF",
    offWhiteColor: "#D9D9D9", // 85% white
    primaryControl: "#78C008", // green
    secondaryControl: "#2D5B66", // dark blue
    tertiaryControl: "#5AB5CC", // light blue
    quaternaryControl: "#D6DEBA", // gold
    darkGray: "#595959",
};

const button = {
    alignItems: "center",
    display: "flex",
    height: controlHeightPx,
    justifyContent: "center",
    width: controlHeightPx,
    backgroundColor: colors.tertiaryControl,
    ':hover': {
        cursor: "pointer",
    },
};

const styles = StyleSheet.create({
    addKeyFrameControl: {
        ...button,
    },
    boundingBox: {
        border: "2px solid white",
        position: "absolute",
        display: "flex",
    },
    boundingBoxBackground: {
      backgroundColor: "white",
      opacity: "0.2",
      height: "100%",
      width: "100%",
      ':hover': {
          cursor: "pointer",
      },
    },
    boundingBoxResize: {
      width: 32,
      height: 32,
      backgroundColor: colors.whiteColor,
      alignSelf: "flex-end",
      position: "absolute",
      bottom: 0,
      right: 0,
      ':hover': {
          cursor: "pointer",
      },
    },
    controlBar: {
        alignItems: "center",
        backgroundColor: colors.darkGray,
        bottom: 0,
        display: "flex",
        height: controlHeightPx,
        justifyContent: "flex-start",
        left: 0,
        position: "absolute",
        width: "100%",
    },
    deleteKeyFrameControl: {
      marginLeft: 10,
        ...button,
    },
    keyFrameControl: {
        backgroundColor: colors.primaryControl,
        bottom: 0,
        color: colors.primaryControl,
        height: 25,
        position: "absolute",
        width: scrubberWidthPx,
        ':hover': {
            cursor: "pointer",
        },
    },
    keyFrameControlHighlighted: {
      backgroundColor: colors.whiteColor,
    },
    navBar: {
      left: 0,
      top: 0,
      width: "100%",
      height: controlHeightPx,
      backgroundColor: colors.offWhiteColor,
      display: "flex",
      justifyContent: "space-between",
    },
    navBarGroup: {
      display: "flex",
      flexFlow: "row nowrap",
      alignItems: "center",
    },
    navBarTitle: {
      fontSize: 17,
      fontFamily: ["sans-serif"],
      color: colors.darkGray,
      marginLeft: 8,
    },
    navBarSelect: {
      marginLeft: 8,
    },
    navBarCancelButton: {
      fontSize: 17,
      fontFamily: ["sans-serif"],
      color: colors.tertiaryControl,
      marginRight: 8,
    },
    navBarSaveButton: {
      fontSize: 17,
      fontFamily: ["sans-serif"],
      color: colors.whiteColor,
      backgroundColor: colors.primaryControl,
      marginRight: 8,
      borderRadius: 4,
    },
    playControl: {
      marginRight: scrubberWidthPx,
        ...button,
    },
    playerContainer: {
        left: 0,
        position: "absolute",
        top: 0,
        width: fullWidthPx,
    },
    scrubber: {
        backgroundColor: colors.quaternaryControl,
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
    videoContainer: {
      width: "100%",
      height: videoHeightPx,
    },
    videoPlayer: {
      width: "100%",
      height: videoHeightPx,
    },
});

module.exports = Page;
