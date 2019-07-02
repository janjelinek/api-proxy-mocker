# api-mock-bouncer

# Prologue

Initial idea was use Haskell to learn something new, but I start falling into lot of references,
so I took something more familiar to me and with NodeJs it was done quickly.

h2. What is going on?

It allows you to mock some API responses and keep rest of API calls to original source. Some kind of proxy with partial mocking.
What is important, you can mock data by configuration in `mock_response.json` file, or by passing specific headers.

# How to start?

Check your node version (`nvm use`) or see `.nvmrc`.
Install all dependencies `yarn install` or `npm install`

And run mock server

```
node index.js
```

Now you can change config for your API (PRO-NEXT for example) to `http://localhost:3000`


Currently is everything hardcoded to original API url `https://api-staging.globalwebindex.com` and port `3000`

What is good for me, you can easily change `mock_response.json` file on fly, so for example, when you need change for upcoming request, just edit file.
Also there is exact match to API url so currently I let it filled with some working example `"forUrl": "/api/v2/query"`.
As you can see, this place can be changed and no URL will be matched so it means all requests will be proxied to original destination.

Important note about `mock_response.json`. If more URL will match, only first one will be taken. Probably, because I did not tested it :D