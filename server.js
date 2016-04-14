
var express = require('express');
var fs = require('fs');
var app = express();
const bodyParser = require('body-parser');
var dataDirectory = 'data'
var videoDirectory = 'video'

var parseCSV = function(data) {
  return data.split(/\n/g).map(
    line => line.split(/,/g).map(num => parseFloat(num))
  )
}

const encodeCSV = data => {
  return data.map(line => {
    return line.join(',');
  }).join('\n')
}

var readCSV = function(name) {
  var data = fs.readFileSync(dataDirectory + '/' + name).toString('utf8');
  return parseCSV(data);
}

app.use(bodyParser.json())
// Respond to GET requests on `/data`
app.get('/data', function (request, response) {
  const fileNames = fs.readdirSync(dataDirectory).filter(function (name) {
    return name.match(/\.csv$/)
  });
  response.json(fileNames.reduce(function (dict, name) {
    dict[name.slice(0, -4)] = readCSV(name); // slice off the ".csv" bit
    return dict
  }, {}))
})

app.post('/data/:youtubeid', (request, response) => {
  const id = request.param('youtubeid');
  const CSVData = encodeCSV(request.body)
  fs.writeFileSync(dataDirectory + '/' + id + '.csv', CSVData);
  console.log('saved')
  response.send('All good!')
  response.end(200)
})

// Serve the static files in the root directory
app.use(express.static('.'))

app.listen(3050, function () {
  console.log('Open http://localhost:3050 to get rolling')
})
