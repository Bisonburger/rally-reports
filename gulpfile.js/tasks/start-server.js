var gulp = require('gulp');
var nodemon = require('gulp-nodemon');


function startServerTask() {
  var stream = nodemon({
    script: 'server.js'
  , ext: 'js html json'
  , env: { 'NODE_ENV': 'development' }
  });
  
  stream
      .on('restart', function () {
        console.log('restarted!');
      })
      .on('crash', function() {
        console.error('Application has crashed!\n');
         stream.emit('restart', 10);  // restart the server in 10 seconds 
      });

}
gulp.task('start-server', startServerTask);
module.exports = startServerTask;