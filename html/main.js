$(document).ready(function() {	
    var canvas = this.__canvas = new fabric.Canvas('canvas', {
        selection: false, 
        renderOnAddRemove: false, //increases speed 
        moveCursor: 'default', 
        hoverCursor: 'default'
    });    	
	fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';
	
	responsive();	

    var line = makeLine([ 250, 125, 250, 175 ]),
		line2 = makeLine([ 250, 175, 250, 250 ]),
		line3 = makeLine([ 250, 250, 300, 350]),
		line4 = makeLine([ 250, 250, 200, 350]),
		line5 = makeLine([ 250, 175, 175, 225 ]),
		line6 = makeLine([ 250, 175, 325, 225 ]);	

	canvas.add(line, line2, line3, line4, line5, line6);

	canvas.add(
		makeCircle(line.get('x1'), line.get('y1'), null, line),
		makeCircle(line.get('x2'), line.get('y2'), line, line2, line5, line6),
		makeCircle(line2.get('x2'), line2.get('y2'), line2, line3, line4),
		makeCircle(line3.get('x2'), line3.get('y2'), line3),
		makeCircle(line4.get('x2'), line4.get('y2'), line4),
		makeCircle(line5.get('x2'), line5.get('y2'), line5),
		makeCircle(line6.get('x2'), line6.get('y2'), line6)
    
  );
	canvas.renderAll();

  canvas.on('object:moving', function(e) {
    var p = e.target;
    p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
    p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
    p.line3 && p.line3.set({ 'x1': p.left, 'y1': p.top });
    p.line4 && p.line4.set({ 'x1': p.left, 'y1': p.top });
    canvas.renderAll();
  });

function makeCircle(left, top, line1, line2, line3, line4) {
    var c = new fabric.Circle({
      left: left,
      top: top,
      strokeWidth: 2,
      radius: 10,
      fill: '#fff',
      stroke: '#666'
    });
    c.hasBorders = false;

    c.line1 = line1;
    c.line2 = line2;
    c.line3 = line3;
    c.line4 = line4;

    return c;
  }

 function makeLine(coords) {
    return new fabric.Line(coords, {
      fill: 'red',
      stroke: 'red',
      strokeWidth: 2      
    });
  }
  
  

//======================================================================
//canvas page adjustments
function responsive() {
	var widthn = $("#canvas-container").width();
    var heightn = $("#canvas-container").height();

    canvas.setDimensions({
        width: widthn,
        height: heightn
    });
};

$(window).resize(function() {
	responsive();	
});  
  
});



