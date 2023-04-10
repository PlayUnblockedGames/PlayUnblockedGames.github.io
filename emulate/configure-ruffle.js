const configMap = {
	"autoplay": {true: "on", false: "off"},
	"unmuteOverlay": {true: "visible", false: "hidden"},
	"letterbox": {true: "on", false: "off"}
};
const defaultConfig = {
	"warnOnUnsupportedContent": false,
	"letterbox": "on",
	"showSwfDownload": true,
	"forceScale": true,
	"autoplay": "on",
	"menu": false,
 	"scale": "showAll",
	"quality": "best",
	"unmuteOverlay": "hidden",
	"preloader": false
};
const defaultSWF = 'logo-anim.swf';
const urlParams = new URLSearchParams(window.location.search);
const swfName = "/emulate/swf/" + urlParams.get('swf');
urlParams.delete('swf'); // Not part of Ruffle config object
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = defaultConfig;
for (opt of urlParams.keys()) {
	let val = urlParams.get(opt);
	try {
		val = Boolean(JSON.parse(val));
		val = configMap[opt][val];
	} catch {}
	window.RufflePlayer.config[opt] = val;
}
