// content of index.js
const http = require('http')
const fs = require('fs')
const requestModule = require('request')

const port = 3000

const GW_API_URL = 'https://api-staging.globalwebindex.com'
const MOCK_CODE_HEADER = 'mock_responsecode'
const MOCK_RESPONSE_HEADER = 'mock_response'

const MOCK_FILE = './mock_response.json'


const getMockFromFile = (request) => {
  if (fs.existsSync((MOCK_FILE))) {
    console.log('Read mock data from file')

    let fileMock = fs.readFileSync(MOCK_FILE, "utf8")
    fileMock = JSON.parse(fileMock)

    return fileMock.find((mock) => mock.forUrl && mock.forUrl === request.url)
  }
}

const requestHandler = (request, response) => {
  let responseCode = 200
  let responseJson = {}
  let canMock = !(request.method === 'OPTIONS' || request.method === 'HEAD')
  console.log('============== Processing ' + request.url + ' =================');

  const finishHim = () => {
      response.writeHead(responseCode, {'Content-Type': 'application/json; charset=UTF-8', 'Access-Control-Allow-Origin': '*'})
      console.log(request.url)
      response.end(JSON.stringify(responseJson))
  }
  const fileMock = getMockFromFile(request)
  if (canMock && fileMock) {
    console.log('Found mock for URL');
    if (fileMock.responseCode) {
      console.log('File Mock response code to ' + fileMock.responseCode)
      responseCode = fileMock.responseCode
    }

    if (fileMock.responseData) {
      console.log('File Mock response JSON')
      responseJson = fileMock.responseData
    }

    finishHim();

  } else if (canMock && (request.headers[MOCK_CODE_HEADER] || request.headers[MOCK_RESPONSE_HEADER])) {
    if (request.headers[MOCK_CODE_HEADER]) {
      responseCode = parseInt(request.headers[MOCK_CODE_HEADER])
      console.log('Mock response code to ' + responseCode)
    }

    if (request.headers[MOCK_RESPONSE_HEADER]) {
      responseJson = JSON.parse(request.headers[MOCK_RESPONSE_HEADER])
      console.log('Mock response JSON')
    }

    finishHim()

  } else {
    console.log('Proxying to original GW API URL: ' + GW_API_URL + request.url)
    let body = ''

    if (request.headers['stop']) {
      console.log('This is not funny, stop it');

      request.on('data', chunk => {
        console.log('data reading', chunk.toString())
        body += chunk.toString(); // convert Buffer to string
      });

      response.end();
      return;
    }

    var options = {
      url: GW_API_URL + request.url,
      method: request.method,
      headers: request.headers,
      rejectUnauthorized: false
    }

    const proxyThisShit = (options, response) => {
      requestModule(options, (error, res, body) => {
        if (error) {
          console.error('Request failed', error)
        } else {
          console.log('Proxying finished, woohoo!')
        }
      }).pipe(response)
    }

    console.log('METHOD', request.method)

    if (request.method === 'POST') {
      console.log('Prepare BODY')


      request.on('data', chunk => {
        console.log('data reading')
        body += chunk; // convert Buffer to string
      });

      request.on('end', () => {
        console.log('Finish him', body);
        options.body = body
        proxyThisShit(options, response)
      })

    } else {
      proxyThisShit(options, response)
    }

  }
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})