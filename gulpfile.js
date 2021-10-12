let distPath = require("path").basename(__dirname);
let srcPath = "src";

let fs = require('fs');

let path = {
	build: {
		html: distPath + "/",
		css: distPath + "/css/",
		js: distPath + "/js/",
		images: distPath + "/img/",
		fonts: distPath + "/fonts/",
	},

	src: {
		html: [srcPath + "/*.html", "!" + srcPath + "/_*.html"],
		css: srcPath + "/scss/style.scss",
		js: srcPath + "/js/script.js",
		images: srcPath + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
		fonts: srcPath + "/fonts/*.ttf",
	},

	watch: {
		html: srcPath + "/**/*.html",
		css: srcPath + "/scss/**/*.scss",
		js: srcPath + "/js/**/*.js",
		images: srcPath + "/img/**/*.{jpg,png,svg,gif,ico,webp}"
	},
	clean: "./" + distPath + "/"
};

let {
	src,
	dest
} = require('gulp'),
	gulp = require('gulp'),
	browsersync = require("browser-sync").create(),
	fileinclude = require("gulp-file-include"),
	del = require("del"),
	scss = require('gulp-sass')(require('sass')),
	autoprefixer = require("gulp-autoprefixer"),
	groupMedia = require("gulp-group-css-media-queries"),
	cleanCss = require("gulp-clean-css"),
	rename = require("gulp-rename"),
	uglify = require("gulp-uglify-es").default,
	imagemin = require("gulp-imagemin"),
	webphtml = require('gulp-webp-html'),
	webp = require('imagemin-webp'),
	webpcss = require("gulp-webpcss"),
	svgSprite = require('gulp-svg-sprite'),
	ttf2woff = require('gulp-ttf2woff'),
	ttf2woff2 = require('gulp-ttf2woff2'),
	fonter = require('gulp-fonter'),
	newer = require('gulp-newer');

function browserSync(params) {
	browsersync.init({
		server: {
			baseDir: "./" + distPath + "/"
		},
		port: 3000,
		notify: false
	});
}

function html() {
	return src(path.src.html)
		.pipe(fileinclude())
		.pipe(webphtml())
		.pipe(dest(path.build.html))
		.pipe(browsersync.stream());
}

function css() {
	return src(path.src.css)
		.pipe(
			scss({
				outputStyle: 'expanded'
			}).on('error', scss.logError)
		)
		.pipe(
			groupMedia()
		)
		.pipe(
			autoprefixer({
				overrideBrowserslist: ["last 5 versions"],
				cascade: true
			})
		)
		.pipe(webpcss({
			webpClass: "._webp",
			noWebpClass: "._no-webp"
		}))
		.pipe(dest(path.build.css))
		.pipe(cleanCss())
		.pipe(
			rename({
				extname: ".min.css"
			})
		)
		.pipe(dest(path.build.css))
		.pipe(browsersync.stream());
}

function js() {
	return src(path.src.js)
		.pipe(fileinclude())
		.pipe(dest(path.build.js))
		.pipe(
			uglify()
		)
		.on('error', function (err) {
			console.log(err.toString());
			this.emit('end');
		})
		.pipe(
			rename({
				extname: ".min.js"
			})
		)
		.pipe(dest(path.build.js))
		.pipe(browsersync.stream());
}

function images() {
	return src(path.src.images)
		.pipe(newer(path.build.images))
		.pipe(
			imagemin([
				webp({
					quality: 75
				})
			])
		)
		.pipe(
			rename({
				extname: ".webp"
			})
		)
		.pipe(dest(path.build.images))
		.pipe(src(path.src.images))
		.pipe(newer(path.build.images))
		.pipe(
			imagemin({
				progressive: true,
				svgoPlugins: [{
					removeViewBox: false
				}],
				interlaced: true,
				optimizationLevel: 3
			})
		)
		.pipe(dest(path.build.images));
}

function fonts() {
	src(path.src.fonts)
		.pipe(ttf2woff())
		.pipe(dest(path.build.fonts));
	return src(path.src.fonts)
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts));
}

function fontsOtf() {
	return src('./' + srcPath + '/fonts/*.otf')
		.pipe(fonter({
			formats: ['ttf']
		}))
		.pipe(gulp.dest('./' + srcPath + '/fonts/'));
}

gulp.task('svgSprite', function () {
	return gulp.src([srcPath + '/iconsprite/*.svg'])
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: "../icons/icons.svg",
					example: true
				}
			},
		}))
		.pipe(dest(path.build.images));
});

function fontstyle() {
	let fileContent = fs.readFileSync(srcPath + '/scss/fonts.scss');
	if (fileContent == '') {
		fs.writeFile(srcPath + '/scss/fonts.scss', '', cb);
		fs.readdir(path.build.fonts, function (err, items) {
			if (items) {
				let cfontname;
				for (var i = 0; i < items.length; i++) {
					let fontname = items[i].split('.');
					fontname = fontname[0];
					if (cfontname != fontname) {
						fs.appendFile
						(srcPath+'/scss/fonts.scss','@include font("' + fontname + '","' + fontname + '","400","normal");\r\n', cb);
					}
					cfontname = fontname;
				}
			}
		});
	}
	return src(path.src.html).pipe(browsersync.stream());
}

function cb() {}

function watchFiles(params) {
	gulp.watch([path.watch.html], html);
	gulp.watch([path.watch.css], css);
	gulp.watch([path.watch.js], js);
	gulp.watch([path.watch.images], images);
}

function clean(params) {
	return del(path.clean);
}

let fontsBuild = gulp.series(fontsOtf, fonts, fontstyle);
let buildDev = gulp.series(clean, gulp.parallel(fontsBuild, html, css, js, images));
let watch = gulp.series(buildDev, gulp.parallel(watchFiles, browserSync));

exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.fonts = fontsBuild;
exports.watch = watch;
exports.default = watch;