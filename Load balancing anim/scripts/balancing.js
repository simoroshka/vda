
//these can be modified
var numberOfNodes = 5,
	maxLoad = 15,
	defLoad = false,  		//put true if want to use predefined load (will be random instead)
	load = [15,10],  		//change predefined loads
	defOrient = false, 		//put true if want to use predefined orientations
	orientations = [0,1,0,1,0,1,1,1,0,0,0],
	color1 = 'black',		
	color2 = "#FFAD1F",
	lineHeight = 200,	//distance between top and bottom lines
	distance = 200,		//distance between the nodes
	circleRadius = 30,  //node radius
	topLine = 100,		//coordinate of the top line
	
	loadHeight = 3,		//height of 1 load 
	loadWidth = 15;		//loadBar's width
	

var chain = [];
var mirrorChain = [];
var topArray = [];
var downArray = [];
//arrays for the connection lines segments
var topCon = [];
var botCon = [];


$(document).ready(function() {
	
	//initialize canvas as a fabric object
		canvas = new fabric.Canvas('canvas', {
			selection: false, 
			renderOnAddRemove: false,
			moveCursor: 'default', 
			hoverCursor: 'default'
		});  
		
	canvas.setDimensions({
			width: $(window).width() * 0.9,
			height: $(window).height() * 0.9
		});
		
	createChain(numberOfNodes);	
	var t = 1000;
	var k = 1000;
	setTimeout(createMirrorChain, t, k); //t = timeout for the function to start
										 //k = duration of the animations inside the function				 
										 
	t += k + 1000;								 //you can add more or less to t (= pause between the actions)
	setTimeout(drawCrossConnections, t, k);
	t += k + 1000;
	setTimeout(removeConnections, t, k); 
	t += k + 1000;
	setTimeout(exchangeNodes, t, k); 
	t += k + 1000;
	setTimeout(balanceTwo, t, k+1000);		
	t += k + 1000;
	setTimeout(removeLines, t, k);
	t += k + 100;
	setTimeout(merge, t, k);		
	t += k + 100;
	setTimeout(finalBalance, t, k/2);
	t += k + 100;
	setTimeout(showConnections, t, k); 
	
	animate();
	
}) 

drawCrossConnections = function(k) {
	
	//determine the colors for the top and bottom connection lines
	var colorTop = chain[0].orientation == 1 ? color1 : color2;
	var colorBot = chain[0].orientation == 0 ? color1 : color2;

	//draw the new connection line that starts on the top
	
	var from = {'x': chain[0].leftLine.left, 'y': chain[0].leftLine.top +2};
	var to = {'x': chain[0].center.x, 'y': chain[0].center.y};

	for (var i = 1; i <= chain.length + 1; i++) {		
		var line = new fabric.Line(
		[from.x, from.y, to.x, to.y], {stroke: colorTop, strokeWidth: 2, opacity: 0});
		canvas.add(line);
		line.sendToBack();
		line.animate({opacity: 1}, {duration: k});
		topCon.push(line);
		
		from = {'x': to.x, 'y': to.y}
		
		if (i > chain.length) break;
		if (i == chain.length) {
			to = {'x': to.x + chain[i-1].rightLine.width + circleRadius, 'y': to.y};
			continue;
		}
		
		if (chain[i].orientation == chain[0].orientation){
			to = {'x': chain[i].center.x, 'y': chain[i].center.y};
		}
		else { 
			to = {'x': mirrorChain[i].center.x, 'y': mirrorChain[i].center.y};
		}	
	}
	
	//draw the connection line that starts on the bottom
	
	var from = {'x': mirrorChain[0].leftLine.left, 'y': mirrorChain[0].leftLine.top+3};
	var to = {'x': mirrorChain[0].center.x, 
			  'y': mirrorChain[0].center.y};
	
	for (var i = 1; i <= chain.length + 1; i++) {		
		var line = new fabric.Line(
		[from.x, from.y, to.x, to.y], {stroke: colorBot, strokeWidth: 2, opacity: 0});
		canvas.add(line);
		line.sendToBack();
		line.animate({opacity: 1}, {duration: k});
		botCon.push(line);
		
		
		from = {'x': to.x, 'y': to.y}
		
		if (i > chain.length) break;
		if (i == chain.length) {
			to = {'x': to.x + chain[i-1].rightLine.width + circleRadius, 'y': to.y};
			continue;
		}
		
		if (mirrorChain[i].orientation == mirrorChain[0].orientation){
			to = {'x': mirrorChain[i].center.x, 'y': mirrorChain[i].center.y};
		}
		else {
			to = {'x': chain[i].center.x, 'y': chain[i].center.y};
		}
	}
}

removeLines = function(k) {
	for (var i = 0; i < topCon.length; i++) {
		topCon[i].animate({opacity: 0}, {duration: k});
		botCon[i].animate({opacity: 0}, {duration: k});
	}
}

merge = function(k) {
	
	for (var i = 0; i < chain.length; i++) {		
		var m = mirrorChain[i].load * 5;
		chain[i].loadBarGroup.animate({'top': mirrorChain[i].loadBarGroup.top - m}, {duration: k});
		chain[i].circle.animate({'top': chain[i].circle.top + lineHeight}, {duration: k});
		chain[i].load = chain[i].load + mirrorChain[i].load;	

	}
}
finalBalance = function() {
	var array = [];
	var l = chain.length;
	for (var i = 0; i < l; i++) {
		array[i] = chain[i].load;
	}
	
	//to the right
	for (var i = 0; i < l; i++) {
		if (array[getContID(l, i - 1)] - array[i] == 2) {
			array[getContID(l, i - 1)]--;
			array[i]++;
		}
	}
	//to the left
	for (var i = l-1; i >= 0; i--) {
		if (array[getContID(l, i + 1)] - array[i] == 2) {
			array[getContID(l, i + 1)]--;
			array[i]++;
		}
	}
	for (var i = 0; i < l; i++) {
		chain[i].changeLoad(array[i] - mirrorChain[i].load);
	}
	
}

//balance both of the chains
balanceTwo = function(k) {	
	for (var i = 0; i < 3; i++) {
		balanceArray(topArray, i);
		balanceArray(downArray, i);
	}
	changeChainsLoads(k);
}

//change visuals after balancing
changeChainsLoads = function(k) {
	for (var i = 0; i < chain.length; i++) {
		chain[i].animatedChangeLoad(topArray[i], k);
		mirrorChain[i].animatedChangeLoad(downArray[i], k);
	}
}

//create arrays for balancing
createArrays = function() {
	for (var i = 0; i < chain.length; i++) {
		topArray[i] = chain[i].load;
		downArray[i] = mirrorChain[i].load;
	}
}
balanceArray = function(array, s) {	
	balanceRight(array, s);	
	balanceLeft(array, s);
}
balanceLeft = function(array, s) {
	var newArray = [];
	for (var i = 0; i < array.length; i++) {
		newArray[i] = array[i];
	}
	
	for (var i = 0; i < array.length; i++) {
		var k = 0;
		for (var j = 0; j < maxLoad; j++) {
			var id = getContID(array.length, i+j*(s+1));
	
			if (array[id] >= (j + 1)) {
				newArray[getContID(array.length, i+k*(s+1))]++;
				newArray[id]--;
				k++;
			}			
		}
	}
	
	for (var i = 0; i < array.length; i++) {
		array[i] = newArray[i];
	}
}
balanceRight = function(array, s) {
	
	var newArray = [];
	for (var i = 0; i < array.length; i++) {
		newArray[i] = array[i];
	}
	
	for (var i = 0; i < array.length; i++) {
		var k = 0;
		for (var j = 0; j < maxLoad; j++) {
			var id = getContID(array.length, i-j*(s+1));
	
			if (array[id] >= (j + 1)) {
				newArray[getContID(array.length, i-k*(s+1))]++;
				newArray[id]--;
				k++;
			}			
		}
	}
	
	for (var i = 0; i < array.length; i++) {
		array[i] = newArray[i];
	}
	
}
//get the id as if the chain is a ring
getContID = function(l, i) {
	if (i >=0 && i < l) return i;
	if (i < 0) return getContID(l, l+i);
	return getContID(l, i-l); 
}

exchangeNodes = function(k) {
	
	//move connection lines 
	for (var i = 0; i < topCon.length; i++) {
		if (chain[0].orientation === 0) {
			topCon[i].animate({y1: botCon[0].y1, y2: botCon[0].y1}, {duration: k});
			botCon[i].animate({y1: topCon[0].y1, y2: topCon[0].y1}, {duration: k});
		}
		else {
			topCon[i].animate({y1: topCon[0].y1, y2: topCon[0].y1}, {duration: k});
			botCon[i].animate({y1: botCon[0].y1, y2: botCon[0].y1}, {duration: k});
		}
		
	}
	
	//exchange nodes
	for (var i = 0; i < chain.length; i++) {
		
		if (chain[i].orientation === 0) {
			
			chain[i].circle.animate({'top': chain[i].circle.top + lineHeight}, {duration: k});
			chain[i].loadBarGroup.animate({'top': chain[i].loadBarGroup.top + lineHeight}, {duration: k});
			mirrorChain[i].circle.animate({'top': mirrorChain[i].circle.top - lineHeight}, {duration: k});
			mirrorChain[i].loadBarGroup.animate({'top': mirrorChain[i].loadBarGroup.top - lineHeight}, {duration: k});
			
			var temp = mirrorChain[i];
			mirrorChain[i] = chain[i];
			chain[i] = temp;
		}
	}
	createArrays();
	
	
}
removeConnections = function(k) {
	
	for (var i = 0; i < chain.length; i++) {
		
			
		chain[i].leftLine.animate({'width': 0, 'left': chain[i].leftLine.left + chain[i].leftLine.width}, {duration: k});
		chain[i].rightLine.animate({'width': 0}, {duration: k});
		mirrorChain[i].leftLine.animate({'width': 0, 'left': chain[i].leftLine.left + chain[i].leftLine.width}, {duration: k});
		mirrorChain[i].rightLine.animate({'width': 0}, {duration: k})
	}	
}
showConnections = function(k) {
	for (var i = 0; i < chain.length; i++) {
		chain[i].leftLine.set({'top': topLine + lineHeight + circleRadius});
		chain[i].rightLine.set({'top': topLine + lineHeight + circleRadius});
		mirrorChain[i].leftLine.set({'top': topLine + lineHeight + circleRadius});
		mirrorChain[i].rightLine.set({'top': topLine + lineHeight+ circleRadius});
		
		chain[i].leftLine.animate({'width': (distance - circleRadius*2) / 2, 
								   'left': chain[i].circle.left - distance / 2 + circleRadius}, {duration: k});
		chain[i].rightLine.animate({'width': (distance - circleRadius*2) / 2}, {duration: k});
		mirrorChain[i].leftLine.animate({'width': (distance - circleRadius*2) / 2, 
										 'left': mirrorChain[i].circle.left - distance / 2 + circleRadius}, {duration: k});
		mirrorChain[i].rightLine.animate({'width': (distance - circleRadius*2) / 2}, {duration: k});
	}	
}

createMirrorChain = function(k){
	
	mirrorChain = [];
	for (var i = 0; i < chain.length; i++) {
		mirrorChain[i] = new Node(i);
		mirrorChain[i].orientation = (chain[i].orientation == 1) ? 0 : 1;
		mirrorChain[i].changeLoad(0);
		mirrorChain[i].setGradients();
		mirrorChain[i].circle.fill = '#CCCCCC';
	
		mirrorChain[i].draw();
		
		mirrorChain[i].leftLine.sendToBack();
		mirrorChain[i].rightLine.sendToBack();
		mirrorChain[i].circle.sendToBack();

		mirrorChain[i].leftLine.animate({'top': topLine + lineHeight + circleRadius}, {duration: k});
		mirrorChain[i].rightLine.animate({'top': topLine + lineHeight + circleRadius}, {duration: k});
		mirrorChain[i].circle.animate({'top': topLine + lineHeight}, {duration: k});
		mirrorChain[i].loadBarGroup.animate({'top': mirrorChain[i].loadBarGroup.top + lineHeight}, {duration: k});
	
		mirrorChain[i].center.y = mirrorChain[i].center.y + lineHeight;
		
	}
	
}
createChain = function (n) {
	
	for (var i = 0; i < n; i++) {
		chain[i] = new Node(i);
		chain[i].draw();
	}
	
}

Node = function (i) {
	
	if (defOrient) {
		if (orientations[i] !== undefined) {
			this.orientation = orientations[i];
		}
		else this.orientation = Math.round(Math.random());
		
	}
	else this.orientation = Math.round(Math.random());
	
	if (defLoad) {
		if (load[i] !== undefined) {
			this.load = load[i];
			if (load[i] > maxLoad) maxLoad = load[i];
		}
		else this.load = 0;		
	}
	else this.load = Math.floor(Math.random()*maxLoad + 1);
	
	
	this.leftLine = new fabric.Rect({
			top: topLine + circleRadius,
			left: distance*(i+0.5) + circleRadius,
			width: (distance - circleRadius*2) / 2,
			height: 4
		});

	this.rightLine = new fabric.Rect({
			top: topLine + circleRadius,
			left: distance*(i+1) + circleRadius*2,
			width: (distance - circleRadius*2) / 2,
			height: 4
		});

	this.circle = new fabric.Circle({
			radius: circleRadius,
			top: topLine,
			left: distance * (i+1),
			stroke: 'rgba(0,0,0,0.5)',
			fill: "white",
			strokeWidth: 2,			
			selectable:false
		});
	this.center = {
		'x': this.circle.left + this.circle.radius + 1,
		'y': this.circle.top + this.circle.radius + 1
	};
	
	this.setGradients();
	
	this.loadBar = [];	
	this.loadBarGroup = new fabric.Group();
	
	for (var j = 0; j < maxLoad; j++) {
		this.loadBar[j] = new fabric.Rect({
			top: j * (loadHeight + 2),
			fill: 'black',
			//visible: ((maxLoad - j) <= this.load) ? true : false,
			width: loadWidth,
			height: loadHeight,
			opacity:((maxLoad - j) <= this.load) ? 1 : 0
		});
		this.loadBarGroup.add(this.loadBar[j]);
	}
	
	this.loadBarGroup.top = this.circle.top - (maxLoad + 1) * (loadHeight + 2);
	this.loadBarGroup.left = this.circle.left + (this.circle.width - loadWidth)/2;
}
Node.prototype.setGradients = function() {
	this.leftLine.setGradient('fill', {
		x1: 0,
		y1: 0,
		x2: this.leftLine.width,
		y2: 0,
		colorStops: {
			0: '#E8E8E8',			
			1: this.orientation ? "black" : "#FFAD1F",
		}
	});
	
	this.rightLine.setGradient('fill', {
		x1: 0,
		y1: 0,
		x2: this.rightLine.width,
		y2: 0,
		colorStops: {
			0: this.orientation ? "#FFAD1F" : "black",
			1: '#E8E8E8',	
		}
	});	
	
	//this.circle.fill = this.orientation ? "#f08080" : "#808080";
}

Node.prototype.changeLoad = function(newLoad) {
	for (var i = 0; i < maxLoad; i++) {
		this.loadBar[i].opacity = (maxLoad - i) <=  newLoad ? 1 : 0;
	}
	this.load = newLoad;
}
Node.prototype.animatedChangeLoad = function(newLoad, k) {
	var t = k / maxLoad;
	var diff = newLoad - this.load;
	var bar = this.loadBar;
	
	for (var i = 0; i < Math.abs(diff); i++) {
		
		if (diff > 0) {
			setTimeout(animateHelper, t*(i+1), {bar: bar[maxLoad - this.load - i - 1], opacity: 1});

		}
		if (diff < 0) {
			
			setTimeout(animateHelper, t*(i+1), {bar: bar[maxLoad - this.load + i], opacity: 0});
				
		}
		
		
	}
	this.load = newLoad;
}
animateHelper = function (param) {
	param.bar.animate({opacity: param.opacity}, {duration: 50});
	
}

Node.prototype.draw = function () {
	canvas.add(this.loadBarGroup);	
	
	canvas.add(this.leftLine);
	canvas.add(this.rightLine);
	canvas.add(this.circle);
}

//automatic update of canvas every browser-frame
animate = function () {
	canvas.renderAll();
	fabric.util.requestAnimFrame(animate);
}
