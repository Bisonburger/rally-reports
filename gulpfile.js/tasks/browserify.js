var gulp = require('gulp');
var fs         = require('fs');
var browserify = require('browserify');
var polyify    = require('polyify').configure;
 
function browserifyTask(){
// path to bundle entry point 
var b = browserify({ entries: __dirname +'/../../client/bv-burnup/bv-burnup.js' }); 
 
// apply the polyify transform, optionally passing in configuration 
b.transform(polyify({ browsers: 'IE >= 8' })); 
 
// compile and write out 
b.bundle().pipe(fs.createWriteStream( __dirname + '/../../client/bv-burnup/bv-burnup-browserify.js'));
    
}

gulp.task( 'browserify', browserifyTask );
module.exports = browserifyTask;
