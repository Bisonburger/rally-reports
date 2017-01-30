# Rally Local Development

This is a local setup for Rally Chart local development doesnt rely on the Rally server.

## Setting up

From this directory:

1) Install the dependencies:
    
    $ npm install
    
2) Launch the app from the Terminal:

    $ npm start

Once the server is running, open a browser and point to http://localhost:8222.

When you have the pages just the way you like it, run `gulp inline` which will inline all of the scripts included into one big file dist\index.html suitable for deployment to the Rally Server.


## Installation details

### Required:
* [nodejs](https://nodejs.org/)
* npm (comes with nodejs)

### Installed by npm:
* [jquery 2.2.4](https://www.npmjs.com/package/jquery)
* [express 4](https://www.npmjs.com/package/express)

> Note that other packages (namely the dependencies of these packages) will be installed and appear under node_modules.

## Behind the corporate firewall
If you are behind the corporate firewall, you may have to set up npm to play nice with the proxy (unless you've already done so)

	$ npm set https-proxy http://tus-proxy.ext.ray.com:80
	$ npm set proxy http://tus-proxy.ext.ray.com:80
	$ npm set registry http://registry.npmjs.org/
	$ npm set strict-ssl false

To verify that everything is set

	$ npm config list
