
//process.argv.forEach(function (val, index, array) {
  //console.log(index + ': ' + val);
//});

//console.log( process.argv[2] );


var argv = require('minimist')(process.argv.slice(2));
console.log(argv);



/*var fs = require('fs');

try 
{
	var fabric = require('C:/node_modules/fabric').fabric;
}
catch (e)
{
	console.log('The file couldnt be loaded.');
}


var out = fs.createWriteStream('helloworld.png');

var canvas = fabric.createCanvasForNode(200, 200);
var text = new fabric.Text('Hello world', {
  left: 100,
  top: 100,
  fill: '#f55',
  angle: 15
});
canvas.add(text);

var stream = canvas.createPNGStream();
stream.on('data', function(chunk) {
  out.write(chunk);
});*/


//var nodeCanvas = require('C:/npm/node_modules/canvas');

var fs = require('fs'),
    fabric = require('C:/npm/node_modules/fabric').fabric;

//console.log(nodeCanvas);

var canvas = fabric.createCanvasForNode(300, 250);



//console.log(fabric);

try 
{
	var font = new canvas.Font('Acme', 'assets/fonts/acme.ttf');
}
catch (e)
{
	console.log(e);
}





canvas.contextContainer.addFont(font);  // when using createPNGStream or createJPEGStream
//canvas.contextTop.addFont(font);      // when using toDataURL or toDataURLWithMultiplier

var text = new fabric.Text('regular', {
    left: 150,
    top: 50,
    fontFamily: 'Acme'
});
canvas.add(text);

//console.log('df');

var out = fs.createWriteStream('customfont.png');
var stream = canvas.createPNGStream();
stream.on('data', function(chunk) {
    out.write(chunk);
});
