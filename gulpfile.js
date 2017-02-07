var gulp = require('gulp');
var inlinesource = require('gulp-inline-source');
var nodemon = require('gulp-nodemon');


gulp.task('inline', () => gulp.src('./client/burnup.html')
                                .pipe(inlinesource({
                                    rootpath: './node_modules',
                                    compress: false,
                                    pretty: false
                                }))
                                .pipe(gulp.dest('./dist')));
                                
gulp.task('start', function () {
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

});
                            
                                


