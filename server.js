//
// Simple Proxy server for agile.rem.ray.com
// This helps to get around the CORS issues with ajax...
//
var http = require('http');
var path = require('path');
var express = require('express');
var fs = require('fs');

var app = express();
var server = http.createServer(app);

app.use('/',express.static(path.resolve(__dirname, 'client')));
app.use('/dist',express.static(path.resolve(__dirname, 'dist')));
app.use( '/highcharts', express.static(path.resolve(__dirname, 'node_modules/highcharts')));
app.use( '/jquery', express.static(path.resolve(__dirname, 'node_modules/jquery')));


// set up routes for REST services
var router = express.Router();
app.use('/slm/webservice/v2.0/', router);

router.route( '/hierarchicalrequirement' ).get( (req,res) => res.json(JSON.parse(fs.readFileSync( './data/userstories.json'))) );

router.route( '/iteration/:iterationId').get( (req,res) => res.json( JSON.parse( fs.readFileSync( `./data/iteration/${req.params.iterationId}.json` ))));

router.route( '/Iteration/:iterationId/UserIterationCapacities').get( (req,res) => res.json( JSON.parse(fs.readFileSync( `./data/iteration/${req.params.iterationId}-uic.json` )) ));

router.route( '/useriterationcapacity/:uicId').get( (req,res) => res.json( JSON.parse(fs.readFileSync( `./data/uic/${req.params.uicId}.json` )) ));

server.listen(process.env.PORT || 8222, process.env.IP || "127.0.0.1", () => {
    var addr = server.address();
    console.log( `Server listening at ${addr.address}:${addr.port}`);
});


