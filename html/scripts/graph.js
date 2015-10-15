/*    Begin Plugin (for window changing visibility event)  */
// the plugin has to be here, in the beginning of the script.
;;(function($){$.winFocus||($.extend({winFocus:function(){var a=!0;$(document).data("winFocus")||$(document).data("winFocus",$.winFocus.init());for(x in arguments)"object"==typeof arguments[x]?(arguments[x].blur&&($.winFocus.methods.blur=arguments[x].blur),arguments[x].focus&&($.winFocus.methods.focus=arguments[x].focus),arguments[x].blurFocus&&($.winFocus.methods.blurFocus=arguments[x].blurFocus),arguments[x].initRun&&(a=arguments[x].initRun)):"function"==typeof arguments[x]?
void 0===$.winFocus.methods.blurFocus?$.winFocus.methods.blurFocus=arguments[x]:($.winFocus.methods.blur=$.winFocus.methods.blurFocus,$.winFocus.methods.blurFocus=void 0,$.winFocus.methods.focus=arguments[x]):"boolean"==typeof arguments[x]&&(a=arguments[x]);if(a)$.winFocus.methods.onChange()}}),$.winFocus.init=function(){$.winFocus.props.hidden in document?document.addEventListener("visibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden=
"mozHidden")in document?document.addEventListener("mozvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="webkitHidden")in document?document.addEventListener("webkitvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="msHidden")in document?document.addEventListener("msvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="onfocusin")in document?document.onfocusin=document.onfocusout=$.winFocus.methods.onChange:
window.onpageshow=window.onpagehide=window.onfocus=window.onblur=$.winFocus.methods.onChange;return $.winFocus},$.winFocus.methods={blurFocus:void 0,blur:void 0,focus:void 0,exeCB:function(a){$.winFocus.methods.blurFocus?$.winFocus.methods.blurFocus(a,!a.hidden):a.hidden?$.winFocus.methods.blur&&$.winFocus.methods.blur(a):$.winFocus.methods.focus&&$.winFocus.methods.focus(a)},onChange:function(a){var b={focus:!1,focusin:!1,pageshow:!1,blur:!0,focusout:!0,
pagehide:!0};if(a=a||window.event)a.hidden=a.type in b?b[a.type]:document[$.winFocus.props.hidden],$(window).data("visible",!a.hidden),$.winFocus.methods.exeCB(a);else try{$.winFocus.methods.onChange.call(document,new Event("visibilitychange"))}catch(c){}}},$.winFocus.props={hidden:"hidden"})})(jQuery);
/*    End Plugin      */



var canvas = null;
var context = null;
var graph = null;


var interval = null,   //timer
    playing = false;


// for graph editing mode
var mousePressed = false,
	selectedVertex = null,
	prevPos = 0,
	clickedTarget = null,		
	shiftPressed = false,
	startVertex = null, //for edge drawing
	drawLine = false,
	newEdge = null;
	
// drawing parameters
var nodeRadius = 15,	//default, changes according to the grid size
	edgeWidth = 2,
	tokenSize = 50,
	tokenMinSize = 50,
	tokenSpeed = 2,
	tokenColor = 'red', //changes in SetTokenColor according to the scale;
	tokenRadiuses = []; //memoization for better performance
	
	
	
//----------------------------------------------------------------------------
// Classes 
//----------------------------------------------------------------------------

	Graph = function (vertices, edges) {
		if(typeof vertices != "object"){ vertices = [] };
        if(typeof edges != "object"){ edges = [] };
        
		this.vertices = vertices;
        this.edges = edges;		
		
	};
	Graph.prototype.draw = function(){			
			canvas.clear();
			this.edges.forEach(function(e) { e.draw(); });			
			this.vertices.forEach(function(v) { v.draw(); });
		};
	// re-enumerate vertices starting from a given position
    // 	so that IDs are continuous. 
	Graph.prototype.reNumber = function(id) {		
		var length = this.vertices.length;		
		for (var i = id; id < length; id++) {
			this.vertices[id].id = id;			
		}	
	}
	Graph.prototype.addEdge = function(from, to) {
		var edge = new Edge (this.edges.length, from, to);
		this.edges.push(edge);
		
		resetSimulation();
	}
	// get the maximum vertex degree in the graph
	Graph.prototype.getMaxDegree = function () {
		var max = 0;
		
		for (var i = 0; i < graph.vertices.length; i++) {
			if (graph.vertices[i].degree > max) {
				max = graph.vertices[i].degree;
			}
		}		
		return max;
	}
	
	Vertex = function (id, x, y) {
		if(typeof id != "number"){ return false };
        if(typeof x != "number" || typeof y != "number"){ return false };
	
        this.id = id;        
		this.x = x;
        this.y = y; 
		
        this.degree = 0;
        this.edges = [];
		this.neighbours = [];
		
		this.tokens = 0;
		this.visited = 0;
		
		//for cycle detection and drawing
		this.incoming = [];
		this.outcoming = [];
		this.mapInOut = [];
		this.inConnections = [];
		this.outConnections = [];
        
		// fabric shape for the vertex
		this.shape = new fabric.Circle({
			radius: nodeRadius,
			top: y - nodeRadius,// + offsetY,
			left: x - nodeRadius,// + offsetX,
			stroke: 'rgba(0,0,0,0.5)',
			strokeWidth: 2,
			fill: 'rgba(250,250,250,1.0)',			
			hasControls: false,
			hasBorders: false,	
			selectable: shiftPressed,
			object: this,
			name: 'vertex'
		});
		// fabric shape for tokens in the vertex
		this.tokenShape = new fabric.Circle({
			radius: Math.min(this.tokens, 2),
			top: y,
			left: x,
			fill: tokenColor,			
			selectable: false,
			object: this,
			name: 'token'
		})
	};
	// draw the vertex
	Vertex.prototype.draw = function() {			 
			canvas.add(this.shape);					
			this.drawTokens();
        };		
	// update the shape of tokens in the vertex
	Vertex.prototype.drawTokens = function () {	
			var radius = getTokenRadius(this.tokens);
			this.tokenShape.radius = radius;
			//centering the token shape inside a vertex is not as simple as one might think
			this.tokenShape.top = this.y - radius + this.shape.strokeWidth / 2;
			this.tokenShape.left = this.x - radius + this.shape.strokeWidth / 2;
			
			//this.tokenShape.top = this.y + offsetX - radius + this.shape.strokeWidth / 2;
			//this.tokenShape.left = this.x + offsetY - radius + this.shape.strokeWidth / 2;
			
			this.tokenShape.width = radius * 2;
			this.tokenShape.height = radius * 2;
			canvas.remove(this.tokenShape);			
			canvas.add(this.tokenShape);
		}	
	// change token's color and size (in case of scaling) 
	Vertex.prototype.changeToken = function () {
		this.tokenShape.fill = tokenColor;
		this.tokenShape.radius = getTokenRadius(this.tokens);
		this.drawTokens();
	}
			
	Vertex.prototype.removeTokens = function () {		
		graphTokens[this.id] = 0;
		this.tokens = 0;		
		updateGraphTokens();
		
		resetSimulation();
	}
	// delete an edge, connected to the vertex
	Vertex.prototype.deleteEdge = function (edge) {
		
		var k;
		
		//delete another vertex from neighbours
		if (edge.from !== this) {
			k = this.neighbours.indexOf(edge.from);
		}
		else k = this.neighbours.indexOf(edge.to);
		if (k > -1) { 
			this.neighbours.splice(k, 1);
		}				
		
		//delete the edge
		k = this.edges.indexOf(edge);
		if (k > -1) { 
			this.edges.splice(k, 1);
		}	
		
		//decrease degree
		this.degree--;
		resetSimulation();
		
	}
	// move the vertex and its edges, tokens and paths
	Vertex.prototype.move = function() {		
		// update vertex
		this.x = this.shape.left + nodeRadius;
		this.y = this.shape.top + nodeRadius;

		// update token shape
		this.tokenShape.set({'top': this.y - this.tokenShape.radius + this.shape.strokeWidth / 2,
							 'left': this.x - this.tokenShape.radius + this.shape.strokeWidth / 2});
		
		// update each connected edge
		for (var i = 0; i < this.edges.length; i++) {
			
			if (this.edges[i].from === this) {
				this.edges[i].shape.set({'x1': this.x, 'y1': this.y});
			} 
			else {
				this.edges[i].shape.set({'x2': this.x, 'y2': this.y});				
			}			
		}
		graph.draw();
		
		if (converged) {
			this.calcVConnections();
			for (var i = 0; i < this.neighbours.length; i++) {
				this.neighbours[i].calcVConnections();
			}
			drawCycles();
		}		
		canvas.renderAll();
	}
	// calculate coordinates of connection points for path drawing
	Vertex.prototype.calcVConnections = function () {
		for (var edgeN = 0; edgeN < this.edges.length; edgeN++) {
			var theta = 0.25; // 0.25 - angle in rads, tells how far the points are from the corresponding edge. 	
			
			var x1, y1, x2, y2, alpha, r, t;
			var p1 = {}, p2 = {};
			
			x1 = this.x;		
			y1 = this.y;
					
			r = nodeRadius * 1.3;
			x2 = this.neighbours[edgeN].x;
			y2 = this.neighbours[edgeN].y;

			t = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
					
			alpha = Math.acos((x2 - x1)/t);
			if (Math.asin((y2 - y1)/t) < 0) {
					alpha *= -1;
			}			
			
			p1.x = r * Math.cos(alpha + theta) + x1;
			p1.y = r * Math.sin(alpha + theta) + y1;
				
			p2.x = r * Math.cos(alpha - theta) + x1;
			p2.y = r * Math.sin(alpha - theta) + y1;
			
			this.inConnections[edgeN] = p1;
			this.outConnections[edgeN] = p2;			
	
		}
	}
	// for cycle detection (pairs incoming and outcoming token flows)
	Vertex.prototype.pairFlows = function() {
		
		for (var inc = 0; inc < this.degree; inc++) {
			for (var out = 0; out < this.degree; out++) {
				for (var i = cycleStart; i < cycleLength + cycleStart - 1; i++){
					if (this.outcoming[out][0] == '#') break;
					if (this.outcoming[out][i+1] != this.incoming[inc][i]) {
						//if mismatch, go to the next array
						out++;
						i = cycleStart-1;						
					}
					
					//if the whole thing matches
					else if (i === cycleStart + cycleLength - 2) {
						this.mapInOut[inc] = out;	
						this.outcoming[out][0] = '#'; //make sure we will not match it twice
						out = this.degree;						
						break;
					}
				}
			}			
		}
	}
	// get the edge's ordering number in the vertex
	Vertex.prototype.getEdgeN = function(edge) {
		for (var i = 0; i < this.degree; i++) {
			if (this.edges[i] ===  edge) return i;
		}
		return -1;
	}
	Vertex.prototype.randomizePorts = function () {
		
		var i = this.edges.length;
		var t1, t2, r;

		// While there remain elements to shuffle...
		while (0 !== i) {

		// Pick a remaining element...
			r = Math.floor(Math.random() * i);
			i--;

			// And swap it with the current element.
			t1 = this.edges[i];
			t2 = this.neighbours[i];
			this.edges[i] = this.edges[r];
			this.neighbours[i] = this.neighbours[r];
			this.edges[r] = t1;
			this.neighbours[r] = t2;
		}
		
	}
	Vertex.prototype.orderPorts = function () {
		var sortedEdges = [];
		var sortedNeighbours = [];
		var ids = [];
	
		for (var i = 0; i < this.edges.length; i++) {
			ids[i] = this.neighbours[i].id;
		}
		ids.sort(function(a, b){return a-b});
		
		for (var i = 0; i < this.edges.length; i++) {
			for (var j = 0; j < this.edges.length; j++) {
				if (this.neighbours[j].id == ids[i]) {
					sortedEdges[i] = this.edges[j];
					sortedNeighbours[i] = this.neighbours[j];
					break;
				}
			}
		}
				
		this.edges = sortedEdges;
		this.neighbours = sortedNeighbours;
	}
	
	Edge = function (id, from, to) {
		if(typeof id != "number"){ return false };
        if(typeof from != "object" || typeof to != "object"){ return false };
        
        this.id = id;
        this.from = from;
        this.to = to;      

		//inform the connected vertices about the edge, and increment their degrees. 
		from.edges.push(this);
		from.degree++;
		to.edges.push(this);
		to.degree++;		
        from.neighbours.push(to);
		to.neighbours.push(from);
				
		//create line object
		this.shape = new fabric.Line(
			[from.x, from.y,
			to.x, to.y], {
			//[from.x + offsetX, from.y + offsetY,
			//to.x + offsetX, to.y + offsetY], {
			stroke: 'black',
			padding: 5,
			strokeWidth: edgeWidth, 
			hasBorders: false,
			lockRotation: true,
			lockScalingX: true,
			lockScalingY: true,
			lockMovementX: true,
			lockMovementY: true,
			hasControls: false,
			selectable: false,
			perPixelTargetFind: true,
			object: this,
			name: 'edge'		
			}
		);		
	};
	// add to canvas
	Edge.prototype.draw = function() {
			canvas.add(this.shape);
    };	
	
	


//----------------------------------------------------------------------------
// animating
//----------------------------------------------------------------------------

	// calculate and save or load the radius
	function getTokenRadius(tokens) {
		if (typeof tokenRadiuses[tokens] == 'undefined') {
			tokenRadiuses[tokens] = Math.sqrt(tokens * tokenSize / Math.PI);
		}
		return tokenRadiuses[tokens];
	}	
	
	// animate tokens moving from one vertex to another
	function animateTokens(from, to, amount) {
		
		// don't animate movement at high speeds (anti-epilepsy feature)
		if (tokenSpeed > 6) {
			to.drawTokens();	   
			from.drawTokens();
			return;
		}
		
		var radius = getTokenRadius(amount);
		var token = new fabric.Circle ({						
			radius: radius,
			top: from.y - radius + from.shape.strokeWidth / 2,
			left: from.x - radius + from.shape.strokeWidth / 2,			
			fill: tokenColor,			
			selectable: false
		});
		canvas.remove(from.tokenShape); //delete the static shape before animating
		canvas.add(token); 				//add new to be animated shape
		
		
		token.animate({'left': to.x - radius, 'top': to.y - radius,}, {				
				onComplete: function() {
					canvas.remove(token);  //remove the moving shape after the animation is complete
					to.drawTokens();	   //and draw what has come to the vertex on this step
					},
				duration: 1000 / tokenSpeed
			});
		
	}	
	
	// automatic update of canvas every browser-frame
	function animate() {
		canvas.renderAll();
		fabric.util.requestAnimFrame(animate);
	}
	
	
//----------------------------------------------------------------------------
// drawing cycles
//----------------------------------------------------------------------------	
	
	function drawCycles() {
		
		drawnPoints = [];
		loops = 0;
		var segments = graph.edges.length * 4;
				
		while (segments > 0) {
			for (var i = 0; i < graph.vertices.length; i++) {
				var v = graph.vertices[i];
					
				//find a starting point for a cycle
				var start = null;				
				for (var j = 0; j < v.degree; j++){
					//if the point is not yet used for drawing, take it as a start point
					if (drawnPoints.indexOf(v.inConnections[j]) == -1) {
						start = v.inConnections[j];
						var next = {vertex: v, 
									edgeN: j};
						break;
					}
				}
					
				//if found - draw the cycle, otherwise move to the next vertex
				if (start != null) {	
					do {
						drawInnerConnection(next.vertex, next.edgeN);		
						next = drawOuterConnection(next.vertex, next.vertex.mapInOut[next.edgeN]);
						segments -= 2;
						//canvas.renderAll();
					} while (next.vertex.inConnections[next.edgeN] != start);
					loops++;
				}			
			}
		}
	}
	
	// draw a path segment inside a vertex
	function drawInnerConnection(vertex, inConN, outConN) {
		if (typeof outConN === 'undefined') {
			outConN = vertex.mapInOut[inConN];
		}
		var from = vertex.inConnections[inConN];
		var to = vertex.outConnections[outConN];
		
		if (typeof drawnPoints !== 'undefined') drawnPoints.push(from);						
						
		var middle = {};
		
		middle.x = vertex.x - 1;
		middle.y = vertex.y - 1;
		
		drawConnection(from, to, middle);		
	}
	
	// draw a path segment between vertices
	function drawOuterConnection(fromVertex, edgeN, curvature) {
		var next = {};
		var edge = fromVertex.edges[edgeN];		
		
		//find the next vertex
		if (edge.from === fromVertex) {
			next.vertex = edge.to;
		}
		else {
			next.vertex = edge.from;
		}
		
		//get edge number in the next vertex array of edges
		next.edgeN = next.vertex.getEdgeN(edge);
		
		//draw the line
		drawConnection(fromVertex.outConnections[edgeN], 
					   next.vertex.inConnections[next.edgeN],
					   calcMiddle(fromVertex.outConnections[edgeN],next.vertex.inConnections[next.edgeN],curvature));
				
		return next;
	}
	
	//draw a curve - any segment of the path
	function drawConnection(from, to, middle) {
		var line = new fabric.Path('M ' + from.x + ' ' + from.y + ' Q ' + middle.x + ', ' + middle.y + ', '+ to.x + ', ' + to.y, { fill: '', stroke: cycleColors[(loops + 1) % cycleColors.length] });
		line.selectable = false;
		canvas.add(line);
	}
	
	// calculate coordiates of all connection points
	function calcConnectionPoints() {
			var v = graph.vertices.length;
			for (var i = 0; i < v; i++) {
				graph.vertices[i].calcVConnections();				
			}
	}
	
	// calculate middle point for path curve between vertices
	function calcMiddle(from, to, curvature) {
		if (typeof curvature === 'undefined') curvature = 0.1;
		
		var middle = {};
		var x1, y1, x2, y2, alpha, r, t;
		var p = {};
		
		//shortcuts
		x1 = from.x;
		y1 = from.y;
		x2 = to.x;
		y2 = to.y;
		
		//the middle of the line
		p.x = Math.abs(x1 + x2)/2;
		p.y = Math.abs(y1 + y2)/2;
		
		//calculate the line's slope angle
		t = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));				
		alpha = Math.acos((x2 - x1)/t);
		if (Math.asin((y2 - y1)/t) < 0) {
				alpha *= -1;
		}
		
		//curvature depends on the length of the line 
		r = t * curvature;
		
		//calculate coordinates (rotate 90 degree to the left)
		middle.x = r * Math.cos(alpha - Math.PI / 2) + p.x;
		middle.y = r * Math.sin(alpha - Math.PI / 2) + p.y;

		return middle;
	}
		
//----------------------------------------------------------------------------
// control events 
//----------------------------------------------------------------------------
	
	// on randomize ports button click
	randomizePorts = function () {	
			
		for (var i = 0; i < graph.vertices.length; i++) {			
			graph.vertices[i].randomizePorts();			
		}		
		resetSimulation();
		
	}
	
	// on order ports button click
	orderPorts = function () {
		for (var i = 0; i < graph.vertices.length; i++) {
			graph.vertices[i].orderPorts();
		}
		resetSimulation();
	}
	
	// keyboard events
	doKeyDown = function(e) {
		
		//16 - shift
		if (e.keyCode == 16) {
			toggleEditingMode();
		}	
	
		//80 - P
		else if (e.keyCode == 80) {
			if (playing) {
				pause();
			}
			else {
				play();
			}
		}
	}
	
	// go in or out editing mode
	toggleEditingMode = function () {
		
		if (playing) {
			pause();
		}
		shiftPressed = !shiftPressed;
		canvas.forEachObject(function(o) {	
			if (shiftPressed) {					
					
				if (o.name === 'vertex') {
					o.selectable = true;	
				}
				if (o.name === 'token') {
					o.visible = false;
				}
			}	
			else {
				if (o.name === 'vertex') {						
					o.selectable = false;
				}
				if (o.name === 'token') {
					o.visible = true;
				}
			}
			
		});		
		//if exit editing mode on drawing
		if (!shiftPressed && startVertex !== null) {
			abortEdgeDrawing();
		}
		$("#info").slideToggle();
		$("#token-info").slideToggle();
		$("#sim-form").slideToggle();
			
		canvas.renderAll();
	}
	
	// on window is not visible - pause the simulation
	freeze = function () {
		if (vis()) {
			pause();
		}		
	}
	
	// play() and pause() are simulation specific and 
	// must be implemented inside the corresponding js file. 
	
	// on create from JSON - make a graph and update canvas
	create = function () {		
		graph = importJSON($("#JSONinput").val());
		initializeTokens();
		displayExtendedJSON();
		graph.draw();
        canvas.renderAll();		
	}
	
	// on change speed - change speed parameter and 
	// restart the simulation is it was running
	changeSpeed = function () {
		tokenSpeed = $('#speedSlider').val();
		if (playing) {
			clearInterval(interval);	
			$("#pauseBtn").addClass("disabled");	
		}			
	}
	
	// pause when window isn't visible
	$.winFocus(
		function(event) {
			if ($("#playBtn").hasClass("disabled")) {
				pause();
			}
		},
		//start again when the window is visible
		function(event) {
			if ($("#pauseBtn").hasClass("disabled") && playing == true) {
				play();
			}
		}
	);
	
	
	//----------------------------------------------------------------------------
// Graph editing 
//----------------------------------------------------------------------------

	// left clicks
	leftClick = function (options) {
		var target = options.target;
		var name;
		if (typeof target !== 'undefined') name = target.name;
		else name = 'canvas';
		
		// if we are in the graph editting mode
		if (shiftPressed) {
			// if a vertex is clicked 
			if (name === 'vertex') {
				// 
				if (name === 'vertex' && startVertex === null ) {				
					// do nothing, a vertex is being moved
				}
				// otherwise, if another vertex has been clicked, connect
				else if (target.object !== startVertex){					
					graph.addEdge(startVertex, target.object);						
					abortEdgeDrawing();					
					displayJSON();
				}
			}			
		}
	} 	
	
	// right clicks
	rightClick = function (options) {
		var target = options.target;
		var name;
		if (typeof target !== 'undefined') name = target.name;
		else name = 'canvas';
		
		// if we are in the graph editting mode
		if (shiftPressed) {
			// if a vertex is clicked 
			if (name === 'vertex' || name === 'token') {
				// and no edge has been started yet - delete
				if (name === 'vertex' && startVertex === null) {				
					deleteVertex(target.object);
				}
				// otherwise delete vertex and abort edge
				else if (target.object !== startVertex){					
					deleteVertex(target.object);
					abortEdgeDrawing();
				}
			}
			if (name === 'edge') {
				deleteEdge(options.target.object);				
			}
			else abortEdgeDrawing();
		}
		
		// token editing mode
		else {
			// delete tokens
			if (name === 'token' || name === 'vertex') {
				target.object.removeTokens();
			}
		}		
		
		canvas.renderAll();
	}	
	
	// double clicks
	function doubleClick(target, x, y) {
		var name;
		if (typeof target !== 'undefined') name = target.name;
		else name = 'canvas';
		
		// if we are in the graph editting mode
		if (shiftPressed) {
			// if a vertex is double-clicked 
			if (name === 'vertex') {
				// and no edge has been started yet, start
				if (name === 'vertex' && startVertex === null ) {				
					startEdge(target);
				}
				// otherwise, if another vertex has been clicked, connect
				else if (target.object !== startVertex){					
					graph.addEdge(startVertex, target.object);						
					abortEdgeDrawing();					
				}
			}		
			// if it is an empty place, create new vertex
			else if (name === 'canvas') {
				addVertex(x, y);
			}
		}
		
		// token editing mode
		else {
			if (name === 'vertex' || name === 'token') {
				addToken(target.object);
			}
		}
	}
	
	// delete a vertex
	function deleteVertex(vertex) {
		
	
		//delete all connected edges first
		for (var i = vertex.edges.length - 1; i > -1; i--) {
			deleteEdge(vertex.edges[i]);
		}	
		
		//find the index of the element
		var index = graph.vertices.indexOf(vertex);
		//delete it with splice
		if (index > -1) {
			graph.vertices.splice(index, 1);
			graphTokens.splice(index, 1);					
		}		
		//change indexes so there is no holes
		graph.reNumber(index);

		updateGraphTokens();
		resetSimulation();
		
	}
	
	// add new vertex
	function addVertex(x, y) {		
		var newId = graph.vertices.length;
		var newVertex = new Vertex (newId, x, y);
	//	var newVertex = new Vertex (newId, x - offsetX, y - offsetY);
		graph.vertices.push(newVertex);
		graphTokens[newId] = 0;
		
		if (startVertex !== null) {
			graph.addEdge(startVertex, newVertex);
			startVertex = null;
		}
		
		resetSimulation();
		
	}
	
	// start drawing an edge
	function startEdge(target) {
				
		startVertex = target.object;				
			
		newEdge = new fabric.Line(
			[startVertex.x, startVertex.y,
			startVertex.x, startVertex.y], {
			//[startVertex.x + offsetX, startVertex.y + offsetY,
			//startVertex.x + offsetX, startVertex.y + offsetY], {
			stroke: 'black',
			strokeWidth: edgeWidth, 
			hasBorders: false,
			hasControls: false,
			selectable: false,
				
			}
		);
		canvas.add(newEdge);
		newEdge.sendToBack();
		canvas.renderAll();	

	}
	
	// drawing an edge - move
	function updateNewEdge(x, y) {		
		newEdge.set({ x2: x, y2: y });		
		canvas.renderAll();		
	}

	function abortEdgeDrawing() {
		startVertex = null;
		canvas.remove(newEdge);
		drawLine = false;	
		canvas.renderAll();
	}
	
	// delete an edge
	function deleteEdge() {
		
		//delete from connected vertices
		edge.from.deleteEdge(edge);
		edge.to.deleteEdge(edge);
				
		//find the index of the element
		var index = graph.edges.indexOf(edge);		
		
		//delete it with splice
		if (index > -1) {
			graph.edges.splice(index, 1);
		}		
		
		graph.draw();
		canvas.renderAll();
		
		displayJSON();
	}
	
//----------------------------------------------------------------------------
// JSON 
//----------------------------------------------------------------------------

	// make a new graph from json string
	function importJSON(stringJSON) {
		var importedGraph = JSON.parse(stringJSON);
		
		var v = importedGraph.vertices;
		var e = importedGraph.edges;
		
		//clear the previous data
		var vertices = [];
		var edges = []; 
		
		//set nodeRadius
		var size = Math.min ($("#canvas-container").width(), 
							 $("#canvas-container").height());
		nodeRadius = size * 0.2 / Math.sqrt(v.length);
		
		//create proper graph object
		for (var i = 0; i < v.length; i++) {
			vertices.push(new Vertex(v[i].id, v[i].x, v[i].y));
		}
		
		for (var i = 0; i < e.length; i++) {
			edges.push(new Edge(i, getVertexByID(e[i].from, vertices), getVertexByID(e[i].to, vertices)));
		}
		
		
		return new Graph(vertices, edges);
		
	}
	
	
	// transform current graph into JSON and display it in the textarea on the page. 
	function displayJSON() {
		var str = '{"vertices" : [\n';
		for (var i = 0; i < graph.vertices.length; i++) {
			if (i != 0) str += ',\n';
			str += '{"id":' + graph.vertices[i].id + 
				   ',"x":' + Math.round(graph.vertices[i].x) + 
				   ',"y":' + Math.round(graph.vertices[i].y) + 
					'}';
		}
		str += '], \n"edges" : [\n';
		for (var i = 0; i < graph.edges.length; i++) {
			if (i != 0) str += ',\n';
			str += '{"id":' + graph.edges[i].id + 
				   ',"from":' + graph.edges[i].from.id + 
				   ',"to":' + graph.edges[i].to.id + 
					'}';
		}
		str += ']}';
	//	str += '], \n"x" : ' + offsetX + ', "y" : ' + offsetY + '}';
		$("#JSONinput").val(str);
		
		//displayExtendedJSON();
	}
	
	// helper function
	function getVertexByID(id, vertices) {
		for (var i = 0; i < vertices.length; i++) {
			if (vertices[i].id == id) return vertices[i];
		}
	}	
	
//----------------------------------------------------------------------------
// Initializing 
//----------------------------------------------------------------------------	
	
	// make a new graph object of size n
    function makeExample (n) {
        if (typeof n === 'undefined') n = 5;
		else if (typeof n === 'object') n = n.data;
		var size = Math.min ($("#canvas-container").width(), 
							 $("#canvas-container").height());
		
		var offset = size * 0.5 / n;
		
		var vertices = [];
		var edges = [];
		var eID = 0;
		nodeRadius = size * 0.2 / n;
		var distance = (size - offset * 2) / (n - 1);

		for (var i = 0; i < n; i++) {
			for (var j = 0; j < n; j++) {
				vertices.push(new Vertex(n*i+j, distance*i + offset, distance*j + offset));
				if (j > 0) {
					edges.push(new Edge(eID++, vertices[n*i + j-1], vertices[n*i + j]));
				}
				if (i > 0) {
					edges.push(new Edge(eID++, vertices[n*(i-1) + j], vertices[n*i + j]));
				}
			}
		}
					
        return new Graph(vertices, edges);
    };
	
	

	adjustCanvasSize = function() {
		canvas.setDimensions({
			width: $("#canvas-container").width(),
			height: $("#canvas-container").height()
		});
	};
	
	$(window).resize(adjustCanvasSize);	
	
	
	