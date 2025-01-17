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

var use = {
    '/': 'client',
    '/dist': 'dist',
    '/jquery': 'node_modules/jquery',
    '/chart.js': 'node_modules/chart.js',
    '/extrapolate': 'node_modules/extrapolate'
};

// Setup the resolvers for the node_modules files
Object.keys(use).forEach( (lookuppath) => app.use( lookuppath, express.static(path.resolve(__dirname, use[lookuppath]))) );

// set up routes for REST services
var router = express.Router();
app.use('/slm/webservice/v2.0/', router);

router.route( '/hierarchicalrequirement' ).get( (req,res) =>res.json(JSON.parse(fs.readFileSync( `./data/project/stories-${req.query.project.slice( -8 )}.json`))) );
router.route( '/hierarchicalrequirement/:storyId' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/userstory/${req.params.storyId}.json`))) );
router.route( '/hierarchicalrequirement/:storyId/Children' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/userstory/children-${req.params.storyId}.json`))) );
router.route( '/Project/:projectId/Iterations' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/project/iterations-${req.params.projectId}.json`))) );
router.route( '/iteration/:iterationId').get( (req,res) => res.json( JSON.parse( fs.readFileSync( `./data/iteration/${req.params.iterationId}.json` ))));
router.route( '/Iteration/:iterationId/UserIterationCapacities').get( (req,res) => res.json( JSON.parse(fs.readFileSync( `./data/iteration/uic-${req.params.iterationId}.json` )) ));
router.route( '/useriterationcapacity/:uicId').get( (req,res) => res.json( JSON.parse(fs.readFileSync( `./data/uic/${req.params.uicId}.json` )) ));
router.route( '/project' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync('./data/projects.json'))) );
router.route( '/project/:projectId' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/project/${req.params.projectId}.json`))) );
router.route( '/Project/:projectId/Releases' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/project/releases-${req.params.projectId}.json`))) );
router.route( '/release/:releaseId' ).get( (req,res) => res.json( JSON.parse(fs.readFileSync(`./data/release/${req.params.releaseId}.json`))) );
server.listen(process.env.RALLY_PORT || 8222, process.env.RALLY_IP || "127.0.0.1", () => {
    var addr = server.address();
    console.log( `Server listening at ${addr.address}:${addr.port}`);
});


