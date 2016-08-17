# Overview

A technology sample that leverages [Web Messaging](https://html.spec.whatwg.org/multipage/comms.html#web-messaging) with hidden iframe to provide an account chooser across domains

# Setup

Install packages

`bower install`
`npm install`

This demo is currently coded to only allow requests from `*.okta.io:8081` origins.

1. Add 2 DNS entries to your `/etc/hosts` file
- `127.0.0.1 accounts.okta.io`
- `127.0.0.1 example.okta.io`
2. Launch web server on port 8081 to serve static content

## Trusted Origin Whitelist

This sample implements a root domain whitelist that only allows trusted callers.  This is a security-best practice for cross-origin web messaging.

You can modify the whitelist by changing the following variables:

index.html

```js
var iframeOrigin = 'https://accounts.okta.io:8081';
```

discovery/iframe.html

```js
var trustedRootDomains = ['okta.io:8081'];
```

# Demo

1. Launch `https://example.okta.io:8081` and add an account
2. Launch `https://accounts.okta.io:8081` and refresh accounts

> You can use [http-server: a command-line http server](https://github.com/indexzero/http-server) if you don't have an existing web server on your developer machine.
>
> **Note: You'll need to run http-server with the `--ssl` option.**

## Development

To run lint and unit tests:

```bash
[account-chooser-sample]$ npm test
```
