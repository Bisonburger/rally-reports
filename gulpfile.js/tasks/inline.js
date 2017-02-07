var gulp = require('gulp');
var inlinesource = require('gulp-inline-source');


function inlineTask() {
    gulp.src(['./client/bv-burnup/bv-burnup.html'])
        .pipe(inlinesource({
            rootpath: './node_modules',
            compress: false,
            pretty: false
        }))
        .pipe(gulp.dest('./dist'));
}
gulp.task( 'inline', inlineTask );
module.exports = inlineTask;
