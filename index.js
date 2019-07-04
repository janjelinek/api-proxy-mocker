const http = require('http')
const fs = require('fs')
const requestModule = require('request')
const process = require('process')
const path = require('path');

const MOCK_CODE_HEADER = 'mock_responsecode'
const MOCK_RESPONSE_HEADER = 'mock_response'

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'access-control-allow-headers': 'Authorization,content-type'
}

const config = (() => {
  const [ , , ...args ] = process.argv
  let defaultArgs = {
    apiUrl: 'https://api-staging.globalwebindex.com',
    port: 3000,
    mockFile: './mock_response.json',
    mockAll: false,
    collectMode: false
  }

  let skipNext = false;
  args.forEach((fullArg, i) => {
    if (skipNext || fullArg.indexOf('--') === -1) return skipNext = false
    let arg = fullArg.replace('--', '')

    if (defaultArgs[arg] !== undefined) {
      if (typeof defaultArgs[arg] === 'boolean') {
        defaultArgs[arg] = true
      } else if (args[i+1] !== undefined){
        defaultArgs[arg] = args[i+1]
        skipNext = true
      } else {
        console.log('Are you sure about this arg? ' + arg)
      }
    }
  })

  return defaultArgs
})()


const getMockFromFile = (request) => {
  if (fs.existsSync(config.mockFile)) {
    console.log('Read mock data from file')

    let fileMock = fs.readFileSync(config.mockFile, "utf8")
    fileMock = JSON.parse(fileMock)

    const mock = fileMock.find((mock) => mock.forUrl && mock.forUrl === request.url)

    if (mock && mock.responseFile && mock.responseData) {
      console.warn('You have specified "responseFile" and "responseData" for this url ' + request.url + '. What dou you realy want to use, heh?')
    } else if (mock && mock.responseFile) {
      console.log('Reading mock data from file ' + mock.responseFile)
      try {
        let responseFromFile = fs.readFileSync(path.dirname(config.mockFile) + '/' + mock.responseFile, "utf8")
        mock.responseData = JSON.parse(responseFromFile)
      } catch(e) {
        console.error('Reading failed, are you sure about provided file?', e)
      }
    }

    return mock
  }
}

/**
 * Proxy to original API url
 */
const proxy = (request, response) => {
  console.log('Proxying to original API URL: ' + config.apiUrl + request.url)
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

  let options = {
    url: config.apiUrl + request.url,
    method: request.method,
    headers: {
      'User-Agent': 'request',
      'Authorization': request.headers.authorization,
      'Content-type': request.headers['content-type'] || 'application/json'
    },
    rejectUnauthorized: false
  };

  const proxyThis = (options, response) => {
    let collectedBody = ''
    const processThisRequest = ['OPTIONS', 'HEAD'].indexOf(request.method) === -1

    requestModule(options, (error, res, body) => {
      let headers = {
        'Content-Type': 'application/json; charset=UTF-8', ...defaultHeaders
      }
      if (error) {
        console.error('Request failed', error)
      } else {
        if (processThisRequest) {
          console.log('Proxying finished.')
          if (config.collectMode) {
            console.log('Collect mode enabled, save response if not saved already')
            try {
              JSON.parse(body)
              console.log('Got valid JSON response');

              let fileName = path.dirname(config.mockFile) + '/' + request.url.replace(/[^a-z0-9]/ig, '_') + '.json'
              if (!fs.existsSync(fileName)) {
                fs.writeFile(fileName, body, (err) => {
                  if(err) {
                      return console.log(err);
                  }
                  console.log("The file with response was saved.");
                });
              }
            } catch (e) {
              console.log('Response is not valid JSON, ignoring', e, body)
            }
          }
        } else {
          console.log('Do not process this preflight request')
          res = {statusCode: 200}
          headers['Content-Type'] = 'text/plain; charset=utf-8'
        }
      }
      response.writeHead(res.statusCode, headers)
      response.end(body || "")
    })
  }

  console.log('METHOD', request.method)

  if (['POST', 'PUT'].indexOf(request.method) > -1) {
    console.log('Prepare BODY')

    request.on('data', chunk => {
      body += chunk; // convert Buffer to string
    });

    request.on('end', () => {
      console.log('Request body', body);
      options.body = body
      proxyThis(options, response)
    })

  } else {
    proxyThis(options, response)
  }
}

const requestHandler = (request, response) => {
  let responseCode = 200
  let responseJson = {}
  let canMock = !(request.method === 'OPTIONS' || request.method === 'HEAD')
  console.log('============== Processing ' + request.url + ' =================');

  const finishHim = () => {
      let headers = { ...defaultHeaders, 'Content-Type': 'application/json; charset=UTF-8'}
      response.writeHead(responseCode, headers)
      console.log('Mocking url: ' + request.url)
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
    if (canMock && config.mockAll) {
      finishHim()
    } else {
      proxy(request, response)
    }
  }
}

const server = http.createServer(requestHandler)

server.listen(config.port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${config.port}`)
})