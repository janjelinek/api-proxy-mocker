# api-mock-bouncer

# Prologue

Initial idea was use Haskell to learn something new, but I start falling into lot of references,
so I took something more familiar to me and with NodeJs it was done quickly.

## What is going on?

It allows you to mock some API responses and keep rest of API calls to original source. Some kind of proxy with partial mocking.
What is important, you can mock data by configuration in `mock_response.json` file, or by passing specific headers.

# How to start?

Check your node version (`nvm use`) or see `.nvmrc`.
Install all dependencies `yarn install` or `npm install`

## Possible config arguments

* `--apiUrl https://SOME_URL.`  specify original API which will be fetched instead of missing mocks
* `--port 3000`                 specify port of running mock API
* `--mockFile FILE_PATH`        specify file with mocks
* `--mockAll`                   all missing mocks will be replaced by empty body response with 200 code, default is false (not provided argument)
* `--collectMode`               Responses from all not mocked request will be stored to files in path where mockFile is located

And run mock server

```
//with default config
$ node index.js
```
Or use custom config for run (you can run several instances at the same time with different API mocks)

```
$ node index.js --apiUrl https://api-staging.globalwebindex.com --port 3000 --mockFile mock_response.json
```

Now you can change config for your API (PRO-NEXT for example) to `http://localhost:3000`


Currently is everything hardcoded to original API url `https://api-staging.globalwebindex.com` and port `3000`

You can easily change `mock_response.json` file on fly, so for example, when you need change for upcoming request, just edit file.
Also there is exact match to API url so currently I let it filled with some working example `"forUrl": "/api/v2/query"`.
There is support for storing mocks in extra files per request. So you can choose between `responseData` or `responseFile`.
See `mock_response.json` for examples.

Important note about `mock_response.json`. If more URL will match, only first one will be taken. Probably, because I did not tested it :D