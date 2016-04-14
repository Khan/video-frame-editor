const ReactDOM = require("react-dom");
const React = require("react");

const Page = require("./page.jsx");

const fetchTheData = (callback) => {
  fetch('/data').then(r => r.json()).then(d => {
    setTimeout(() => callback(d), 0);
  },
  err => {
    console.error('FAILED TO GET DATA', err)
  })
}

const App = React.createClass({
  getInitialState() {
    return {
      videoData: null,
      currentVideoID: null,
      videoIDs: null,
      loading: true,
    }
  },
  componentWillMount() {
    fetchTheData((data) => {
      const ids = Object.keys(data);
      this.setState({
        videoData: data,
        currentVideoID: ids[0],
        videoIDs: ids,
        loading: false,
      })
    })
  },
  onSave(data) {
    // HACK: Filter out nulls
    const dataWithoutNulls = data.filter(item => {
      return (item[0] != null)
    })
    fetch('/data/' + this.state.currentVideoID, {
      method: "POST",
      body: JSON.stringify(dataWithoutNulls),
      headers: {'Content-Type': 'application/json'}
    })
    this.setState({
      videoData: {
        ...this.state.videoData,
        [this.state.currentVideoID]: data,
      }
    })
  },
  render() {
    if (this.state.loading) {
      return <div>Loading</div>
    }
    return <Page
      currentVideoID={this.state.currentVideoID}
      initialFrameData={this.state.videoData[this.state.currentVideoID]}
      onSave={this.onSave}
      videoIDs={this.state.videoIDs}
      key={this.state.currentVideoID} // this tears down the UI when we change video id's
      setCurrentVideo={currentVideoID => this.setState({currentVideoID})}
    />
  }
})

window.onload = () => ReactDOM.render(<App />, document.getElementById("pagecontainer"));
