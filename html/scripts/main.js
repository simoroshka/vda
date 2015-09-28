/*    Begin Plugin (for window changing visibility event)  */
// the plugin has to be here, in the beginning of the script.
;;(function($){$.winFocus||($.extend({winFocus:function(){var a=!0;$(document).data("winFocus")||$(document).data("winFocus",$.winFocus.init());for(x in arguments)"object"==typeof arguments[x]?(arguments[x].blur&&($.winFocus.methods.blur=arguments[x].blur),arguments[x].focus&&($.winFocus.methods.focus=arguments[x].focus),arguments[x].blurFocus&&($.winFocus.methods.blurFocus=arguments[x].blurFocus),arguments[x].initRun&&(a=arguments[x].initRun)):"function"==typeof arguments[x]?
void 0===$.winFocus.methods.blurFocus?$.winFocus.methods.blurFocus=arguments[x]:($.winFocus.methods.blur=$.winFocus.methods.blurFocus,$.winFocus.methods.blurFocus=void 0,$.winFocus.methods.focus=arguments[x]):"boolean"==typeof arguments[x]&&(a=arguments[x]);if(a)$.winFocus.methods.onChange()}}),$.winFocus.init=function(){$.winFocus.props.hidden in document?document.addEventListener("visibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden=
"mozHidden")in document?document.addEventListener("mozvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="webkitHidden")in document?document.addEventListener("webkitvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="msHidden")in document?document.addEventListener("msvisibilitychange",$.winFocus.methods.onChange):($.winFocus.props.hidden="onfocusin")in document?document.onfocusin=document.onfocusout=$.winFocus.methods.onChange:
window.onpageshow=window.onpagehide=window.onfocus=window.onblur=$.winFocus.methods.onChange;return $.winFocus},$.winFocus.methods={blurFocus:void 0,blur:void 0,focus:void 0,exeCB:function(a){$.winFocus.methods.blurFocus?$.winFocus.methods.blurFocus(a,!a.hidden):a.hidden?$.winFocus.methods.blur&&$.winFocus.methods.blur(a):$.winFocus.methods.focus&&$.winFocus.methods.focus(a)},onChange:function(a){var b={focus:!1,focusin:!1,pageshow:!1,blur:!0,focusout:!0,
pagehide:!0};if(a=a||window.event)a.hidden=a.type in b?b[a.type]:document[$.winFocus.props.hidden],$(window).data("visible",!a.hidden),$.winFocus.methods.exeCB(a);else try{$.winFocus.methods.onChange.call(document,new Event("visibilitychange"))}catch(c){}}},$.winFocus.props={hidden:"hidden"})})(jQuery);
/*    End Plugin      */

var VDA =(function($){
	
	var canvas = null,
		context = null,
        graph = null,
		interval = null,   //timer
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
		tokenSize = 0,
		tokenMinSize = 50,
		tokenSpeed = 2,
		tokenColor = 'red', //changes in SetTokenColor according to the scale;
		tokenRadiuses = []; //memoization for better performance
	
	// for token propagation
	var totalVisits = [], //total visits for each vertex
		graphTokens = [], //tokens currently in each vertex
		newTokens = [],	  //token positions for the next step	
		moveTokens = [],  //how many tokens move from each vertex -
						  //to another (for animation)
	
	// for cycle detection and drawing
	    statesToTime = {},  //map states to time stamps (simulation steps)
		timeStamp = 0,		//the current step of the simulation
		converged = false,
		cycleStart = 0,    
		cycleLength = 0, //the legth of the cycle (steps)
		cycleColors = ['#dc143c', '#008000', '#ff4500', '#800080', '#800000', '#0000cd', '#2f4f4f', '#8b0000', '#4169e1', '#808000'],
		loops = 0,		//the number of closed paths.
		drawnPoints = [];

		
//----------------------------------------------------------------------------
// simulating rotor-router algorithm
//----------------------------------------------------------------------------
	
	simulation = function () {	
		
		// calculate next state and fire the animations 
		interval = setInterval(function() {
	
			fastTokenPropagation();
			
			if (!converged) {
				detectCycles();	
				timeStamp++;				
			}
			
			//update things for the next step
			for (var i = 0; i < graph.vertices.length; i++) {
				graphTokens[i] = newTokens[i];
				graph.vertices[i].tokens = newTokens[i];
				newTokens[i] = 0;
			}
			
			//animate movement for each token group
			for (var i = 0; i < moveTokens.length; i++) {
				for (var j = 0; j < moveTokens[i].length; j++) {
					
					if (i !== j) {
						if (moveTokens[i][j] > 0) {
							//fire animation of token(s)
							animateTokens(graph.vertices[i], graph.vertices[j], moveTokens[i][j]);						
						}
						//save outcoming and incoming amounts for path generation
						
						if (!converged && moveTokens[i][j] >= 0) {
							rememberPath(graph.vertices[i], graph.vertices[j], moveTokens[i][j], timeStamp-1);
						}
					}
				}
			}
			
			//clear the moveTokens array for the next step			
			moveTokens.forEach(function(value, i, arr) {
				value.forEach(function(value, i, arr) {
					arr[i] = 0;
				});				
			});
			
		}, 1200 / tokenSpeed);
		
		animate(); // updates canvas every frame
 	}
	
	// standard rotor-router
	normalTokenPropagation = function () {
			
		//make an algorithm step
		for (var v = 0; v < graph.vertices.length; v++) {
			for (var t = 0; t < graphTokens[v]; t++) {
				if (graph.vertices[v].neighbours.length != 0) {
					var d = totalVisits[v] % graph.vertices[v].degree;
					var u = graph.vertices[v].neighbours[d].id;
					
					//token moves from v to u					
					moveTokens[v][u]++;
						
					newTokens[u]++;
					totalVisits[v]++;
				}
			}			
		}			
	}
	
	// fast rotor-router
	fastTokenPropagation = function () {		
		
			//for each vertex
			for (var v = 0; v < graph.vertices.length; v++) {
				var deg = graph.vertices[v].degree;
				// for each neighbour
				for (var i = 0; i < deg; i++) {
					var u = graph.vertices[v].neighbours[i].id;
					var tokenGroup = Math.floor((totalVisits[v] + graphTokens[v] + i + deg - 1) / deg) - 
								   Math.floor((totalVisits[v] + i + deg - 1) / deg);
					newTokens[u] += tokenGroup;					
					moveTokens[v][u] += tokenGroup;
				}
				totalVisits[v] += graphTokens[v];
			}
			
	}
			
		
//----------------------------------------------------------------------------
// detecting cycles 
//----------------------------------------------------------------------------

	// check if the simulation started repeating itself
	detectCycles = function () {
		var state = getStateString();
		// save the string that describes the state to a hashmap, if it is not there yet
		if (typeof statesToTime[state] === 'undefined') {
			statesToTime[state] = timeStamp;
		}
		// if this state string has been saved already, this is a complete cycle
		else {
			//toggleEditingMode();
			converged = true;
			cycleStart = statesToTime[state];
			cycleLength = timeStamp - statesToTime[state];
			
			mapInOut();
			calcConnectionPoints();
			
			drawCycles();
			
			var str = 'Simulation stabilized after ' + 
					  cycleStart + (cycleStart == 1 ? ' step' : ' steps') + '.<br/>' +
					  'The length of the period: ' + cycleLength + ' steps. <br/>' +
					  'Number of cycles: ' + loops + '.';
			$('#converged').html(str);
			$('#converged').slideToggle();
		}
	}
	// save how many tokens go through vertices at each step (for path identification)
	rememberPath = function (from, to, tokens, timeStamp) {
		
		var toID = from.neighbours.indexOf(to); //get the id of the neighbors
		var fromID = to.neighbours.indexOf(from);
		
		if (typeof from.outcoming[toID] === 'undefined') {
			from.outcoming[toID] = [];
		}
		if (typeof to.incoming[fromID] === 'undefined') {
			to.incoming[fromID] = [];
		}
		from.outcoming[toID][timeStamp] = tokens;
		to.incoming[fromID][timeStamp] = tokens;
	}
	
	getStateString = function () {
		var state = "";
		var v = graph.vertices.length;
		
		for (var i = 0; i < v; i++) {
			state += graphTokens[i];
			state += totalVisits[i] % graph.vertices[i].degree;
		}
		
		return state;		
	}
	// find pairs of incoming+outcoming flows. 
	mapInOut = function () {
		graph.vertices.forEach(function(v) { v.pairFlows(); });
	}
	

//----------------------------------------------------------------------------
// drawing
//----------------------------------------------------------------------------
		
	// calculate appropriate token size
	setTokenSize = function (amount) {
		var k = amount;
		var n = graph.vertices.length;
		var m = graph.edges.length;
		var maxDeg = graph.getMaxDegree();
		
		var maxTokens = k / (2 * m) + maxDeg;
		
		tokenSize = Math.PI * nodeRadius * nodeRadius / (maxTokens * 3);
		if (tokenSize > tokenMinSize) tokenSize = tokenMinSize;
		
		setTokenColor(amount);
		
	}	
	
	// change color of tokens according to the scaling factor
	setTokenColor = function (amount) {
		
		var percentFade = toLogScale(amount, 10, 1000000);
		
		var startColor = {
			red: 255,
			green: 0,
			blue: 0
		};
		var endColor = {
			red: 0, 
			green: 10,
			blue: 80
		};
		
		var diffRed = endColor.red - startColor.red;
		var diffGreen = endColor.green - startColor.green;
		var diffBlue = endColor.blue - startColor.blue;

		diffRed = (diffRed * percentFade) + startColor.red;
		diffGreen = (diffGreen * percentFade) + startColor.green;
		diffBlue = (diffBlue * percentFade) + startColor.blue;
		
		tokenColor = 'rgba(' + Math.ceil(diffRed) + ',' + Math.ceil(diffGreen) + ',' + Math.ceil(diffBlue) + ',1.0)';
		
		graph.vertices.forEach(function(v) { v.changeToken(); });
	}
	
	// scale-size update if the number of tokens has been changed
	updateGraphTokens = function () {
		var total = 0;
		for (var i = 0; i < graphTokens.length; i++) {
			total += graphTokens[i];
		}
		
		setTokenSize(total);
		
		//will be recalculated as needed
		tokenRadiuses = [];
	}
	
	// helper function - amount to percentage on logarithmic scale
	toLogScale = function(a, min, max) {
		if(max === min)
			return 0;
	
		var b = Math.log(max),
			c = (0 === min ? 0 : Math.log(min)),
			d = (0 === a ? 0 : Math.log(a));
			
		return (d-c)/(b-c);
	}

	// calculate and save or load the radius
	getTokenRadius = function (tokens) {
		if (typeof tokenRadiuses[tokens] == 'undefined') {
			tokenRadiuses[tokens] = Math.sqrt(tokens * tokenSize / Math.PI);
		}
		return tokenRadiuses[tokens];
	}

//----------------------------------------------------------------------------
// drawing cycles
//----------------------------------------------------------------------------	
	
	drawCycles = function () {
		
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
						canvas.renderAll();
					} while (next.vertex.inConnections[next.edgeN] != start);
					loops++;
				}			
			}
		}
	}
	
	// draw a path segment inside a vertex
	drawInnerConnection = function (vertex, conN) {
		
		var from = vertex.inConnections[conN];
		var to = vertex.outConnections[vertex.mapInOut[conN]];
		
		drawnPoints.push(from);						
						
		var middle = {};
		
		middle.x = vertex.x - 1;
		middle.y = vertex.y - 1;
		
		//middle.x = vertex.x + offsetX - 1;
		//middle.y = vertex.y + offsetY - 1;
				
		drawConnection(from, to, middle);		
	}
	
	// draw a path segment between vertices
	drawOuterConnection = function (fromVertex, edgeN) {
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
					   calcMiddle(fromVertex.outConnections[edgeN],next.vertex.inConnections[next.edgeN]));
				
		return next;
	}
	
	//draw a path segment
	drawConnection = function (from, to, middle) {
		var line = new fabric.Path('M ' + from.x + ' ' + from.y + ' Q ' + middle.x + ', ' + middle.y + ', '+ to.x + ', ' + to.y, { fill: '', stroke: cycleColors[(loops + 1) % cycleColors.length] });
		line.selectable = false;
		canvas.add(line);
	}
	
	// calculate coordiates of all connection points
	calcConnectionPoints = function () {
			var v = graph.vertices.length;
			for (var i = 0; i < v; i++) {
				graph.vertices[i].calcVConnections();				
			}
	}
	
	// calculate middle point for path curve between vertices
	calcMiddle = function (from, to) {
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
		r = t * 0.1;
		
		//calculate coordinates (rotate 90 degree to the left)
		middle.x = r * Math.cos(alpha - Math.PI / 2) + p.x;
		middle.y = r * Math.sin(alpha - Math.PI / 2) + p.y;

		return middle;
	}
		
	
//----------------------------------------------------------------------------
// animating
//----------------------------------------------------------------------------

	// animate tokens moving from one vertex to another
	animateTokens = function (from, to, amount) {
		
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
			//top: from.y + offsetY - radius + from.shape.strokeWidth / 2,
			//left: from.x + offsetX - radius + from.shape.strokeWidth / 2,
			fill: tokenColor,			
			selectable: false
		});
		canvas.remove(from.tokenShape); //delete the static shape before animating
		canvas.add(token); 				//add new to be animated shape
		
		
		token.animate({'left': to.x - radius, 'top': to.y - radius,}, {			
		//token.animate({'left': to.x - radius + offsetX, 'top': to.y - radius + offsetY,}, {		
				onComplete: function() {
					canvas.remove(token);  //remove the moving shape after the animation is complete
					to.drawTokens();	   //and draw what has come to the vertex  on this step
					},
				duration: 1000 / tokenSpeed
			});
		
	}	
	
	// automatic update of canvas every browser-frame
	animate = function () {
		canvas.renderAll();
		fabric.util.requestAnimFrame(animate);
	}
	
//----------------------------------------------------------------------------
// Classes 
//----------------------------------------------------------------------------

	Graph = function (vertices, edges) {
		if(typeof vertices == "undefined"){ vertices = [] };
        if(typeof vertices != "object"){ return false };
        if(typeof edges == "undefined"){ edges = [] };
        if(typeof edges != "object"){ return false };
        
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
	
	//helper function for array shuffling
	shuffle = function(o){
		for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	}
	
	Edge = function (id, from, to) {
		if(typeof id != "number"){ return false };
        if(typeof from != "object" || typeof to != "object"){ return false };
        
        this.id = id;
        this.from = from;
        this.to = to;      

		//inform the connected vertices about the edge, and increment their degree. 
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
// control events 
//----------------------------------------------------------------------------
	
	// on randomize ports button click
	randomizePorts = function () {	

			
		for (var i = 0; i < graph.vertices.length; i++) {			
			graph.vertices[i].randomizePorts();			
		}
		
		
	}
	
	// on order ports button click
	orderPorts = function () {
		for (var i = 0; i < graph.vertices.length; i++) {
			graph.vertices[i].orderPorts();
		}
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
		
		//84 - T
		else if (e.keyCode == 84) {
			placeTokens();
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
	
	// on play - start the simulation
	play = function() {		
		//if no tokens in the graph, do nothing
		if (graphTokens.reduce(function(a, b) { return a + b; }, 0) === 0) return;
	
		$("#playBtn").addClass("disabled");
		$("#pauseBtn").removeClass("disabled");
		$("#tokenBtn").addClass("disabled");
		$("#removeBtn").addClass("disabled");
		$("#createBtn").addClass("disabled");
		playing = true;
		
		simulation();
	}
	
	// on pause - stop the simulation
	pause = function () {
		$("#playBtn").removeClass("disabled");
		$("#tokenBtn").removeClass("disabled");
		$("#createBtn").removeClass("disabled");
		$("#pauseBtn").addClass("disabled");	
		$("#removeBtn").removeClass("disabled");		
		playing = false;
		
		clearInterval(interval);
		
		//display the simulation state in json
		displayExtendedJSON();
		
	}
	
	// on create from JSON - make a graph and update canvas
	create = function () {		
		graph = importJSON($("#JSONinput").val());
		initializeTokens();
		displayExtendedJSON();
		graph.draw();
        canvas.renderAll();		
	}
	
	// load simulation from JSON
	load = function () {
		importExtendedJSON($("#JSONext").val());
		graph.draw();
        canvas.renderAll();		
	}
	
	// on place tokens - add tokens randomly
	placeTokens = function () {
		initializeTokens();
		randomTokens($("#tokenSlider").val());
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
	
	// restart simulation (after speed change, for example)
	restartSimulation = function () {
		if ($("#playBtn").hasClass("disabled")) {
			$("#pauseBtn").removeClass("disabled");	
			simulation();
		}			
	}
	
	// remove all tokens
	removeTokens = function () {
		
		initializeTokens();
		graph.draw();
		canvas.renderAll();
		displayExtendedJSON();
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
	doubleClick = function (target, x, y) {
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
	
	// add token to a vertex
	addToken = function (vertex) {
		graphTokens[vertex.id]++;
		vertex.tokens++;
		updateGraphTokens();
		
		resetSimulation();		
	}
	
	// change the amount of tokens (size) in a vertex
	changeTokensManually = function (vertex, mouseX, mouseY) {				
		var pos = mouseX + mouseY;
		var diff = pos - prevPos;
		var changeSpeed = tokenSize / 4;
			
		// increase
		if (diff > 1) {			
			graphTokens[vertex.id] += Math.round(diff / changeSpeed);
			vertex.tokens = graphTokens[vertex.id];
			prevPos = pos;
		}
		//decrease
		else if (diff < -1 && graphTokens[vertex.id] > 0) {
			graphTokens[vertex.id] += Math.round(diff / changeSpeed);
			vertex.tokens = graphTokens[vertex.id];
			if (vertex.tokens < 0) {
				graphTokens[vertex.id] = vertex.tokens = 0;
			}
			prevPos = pos;
		}
		
		updateGraphTokens();
		resetSimulation();
	}
	
	// delete a vertex
	deleteVertex = function (vertex) {
		
	
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
	addVertex = function (x, y) {		
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
	startEdge = function (target) {
				
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
	updateNewEdge = function (x, y) {		
		newEdge.set({ x2: x, y2: y });		
		canvas.renderAll();		
	}

	abortEdgeDrawing = function () {
		startVertex = null;
		canvas.remove(newEdge);
		drawLine = false;	
		canvas.renderAll();
	}
	
	// delete an edge
	deleteEdge = function (edge) {
		
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
	importJSON = function (stringJSON) {
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
	
	// load simulation state
	importExtendedJSON = function (stringJSON) {
		
		//load stucture
		graph = importJSON(stringJSON);
		initializeTokens();
		
		//process additional simulation information
		var extendedGraph = JSON.parse(stringJSON);
		var v = extendedGraph.vertices;
		
		for (var i = 0; i < graph.vertices.length; i++) {
			graph.vertices[i].tokens = v[i].tokens;			
			graphTokens[i] = v[i].tokens;
			totalVisits[i] = v[i].rotor;			
		}
		updateGraphTokens();
		
		displayJSON();
	}
	
	// transform current graph into JSON and display it in the textarea on the page. 
	displayJSON = function () {
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
		
		displayExtendedJSON();
	}
	
	// output current simulation in JSON
	displayExtendedJSON = function () {
		var str = '{"vertices" : [\n';
		for (var i = 0; i < graph.vertices.length; i++) {
			if (i != 0) str += ',\n';
			str += '{"id":' + graph.vertices[i].id + 
				   ',"x":' + Math.round(graph.vertices[i].x) + 
				   ',"y":' + Math.round(graph.vertices[i].y) + 
				   ',"tokens":' + graphTokens[i] + 
				   ',"rotor":' + (totalVisits[i] % graph.vertices[i].degree)+ 
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
		$("#JSONext").val("");
		$("#JSONext").val(str);
	}
	
	// helper function
	getVertexByID = function (id, vertices) {
		for (var i = 0; i < vertices.length; i++) {
			if (vertices[i].id == id) return vertices[i];
		}
	}	
	
//----------------------------------------------------------------------------
// Initializing 
//----------------------------------------------------------------------------

	// initialize moveTokens array (used for animation)
	initMovetokens = function () {
		moveTokens = [];
		var v = graph.vertices.length;
		
		// for each vertex
		for (var i = 0; i < v; i++) {				
			moveTokens[i] = [];
			var n = graph.vertices[i].neighbours.length;
			for (var j = 0; j < n; j++) {
				k = graph.vertices[i].neighbours[j].id;				
				moveTokens[i][k] = 0;   
			}
		}	
	}
	
	// initialize token array and parameters 
	initializeTokens = function () {			
		
		var v = graph.vertices.length;
		
		// for each vertex
		for (var i = 0; i < v; i++) {	
			graph.vertices[i].tokens = 0;
			graphTokens[i] = 0;	
		}
		
		resetSimulation();
	}
	
	// reset the auxilary variables 
	resetSimulation = function () {
		newTokens = [];
		totalVisits = [];
		moveTokens = [];
		
		var v = graph.vertices.length;
		// for each vertex
		for (var i = 0; i < v; i++) {
			newTokens[i] = 0;
			totalVisits[i] = 0;
			graph.vertices[i].incoming = [];
			graph.vertices[i].outcoming = [];
		}
		initMovetokens();
		
		converged = false;
		statesToTime = {};
		cycleStart = 0;
		timeStamp = 0;
		$("#converged").html("");
		$("#converged").hide();
		
		displayJSON();		
		graph.draw();
		canvas.renderAll();
	}
	
	// place tokens randomly
	randomTokens = function (amount) {
		setTokenSize(amount);
		
		var v = graph.vertices.length;		
		do {
			for (var i = 0; i < v; i++) {				
				if (Math.random() > 0.7) {
					graphTokens[i]++;
					amount--;
				}
				if (amount == 0) break; 
			}
		} while (amount > 0);
				
		for (var i = 0; i < v; i++) {			
			graph.vertices[i].tokens = graphTokens[i];
			graph.vertices[i].drawTokens();
		}
	}
		
	// create, initialize and draw example graph
	createExample = function (param) {
		graph = makeExample(param.data);
		initializeTokens();
		
		graph.draw();
        canvas.renderAll();
		displayJSON();
	}
	
	// make a new graph object of size n
    makeExample = function (n) {
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
	
	
	$(document).ready(function() {
		
		//controls
		$("#playBtn").click(play);
		$("#pauseBtn").click(pause);
		$("#createBtn").click(create);
		$("#loadBtn").click(load);
		$("#tokenBtn").click(placeTokens);
		$("#removeBtn").click(removeTokens);
		$("#tokenSlider").slider({
				min: 10,
				max: 1000000,
				scale: 'logarithmic',
				step: 5,
				value: 10
			});			
		$("#speedSlider").slider({
			value: 2,
			formater: function(value) {
				return 'Speed: ' + value;
			}
		}).on('change', changeSpeed)
		  .on('slideStop', restartSimulation);
		$("#create3x3").click(3, createExample);
		$("#create4x4").click(4, createExample);
		$("#create5x5").click(5, createExample);
		$("#create6x6").click(6, createExample);
		$("#create8x8").click(8, createExample);
		$("#create10x10").click(10, createExample);
		$("#randomizePorts").click(randomizePorts);
		$("#orderPorts").click(orderPorts);
		
		//initialize canvas as a fabric object
		canvas = new fabric.CanvasEx('canvas', {
			selection: false, 
			renderOnAddRemove: false, //increases performance 
			moveCursor: 'default', 
			hoverCursor: 'default'
		});  
		
		// remove standard browser right-click context menu from the canvas
		$('body').on('contextmenu', 'canvas', function(e){ return false; });

		// add mouse events
		canvas.on({
			'mouse:dblclick': function (options) {
				var p = canvas.getPointer(options.e);
				doubleClick(options.target, p.x, p.y);
			},
			
			'mouse:down': function (options) { 		
				mousePressed = true;
				clickedTarget = options;
				if (options.e.which === 3) {
					
				}
				else {
					if (typeof options.target !== 'undefined') {
						if (options.target.name === 'token') {
							var p = canvas.getPointer(options.e);
							prevPos = p.x + p.y;
							selectedVertex = options.target.object;
						}	
					}
				}		
				
			},
			'mouse:up': function (options) { 	
				mousePressed = false;
				selectedVertex = null;
				if (options.e.which === 3) {
					rightClick (clickedTarget);
				}
				else {
					leftClick (clickedTarget);
				}				
										
			},
			'mouse:move': function (options) { 	
				
					if (mousePressed) {						
						if (selectedVertex !== null && !shiftPressed) {
							var pointer = canvas.getPointer(options.e);
							var posX = pointer.x;
							var posY = pointer.y;							
							changeTokensManually(selectedVertex, posX, posY);
						}						
					}	
					// mouse not pressed
					else {
						// drawing a newly started edge
						if (shiftPressed && startVertex !== null) {
							var pointer = canvas.getPointer(options.e);
							var posX = pointer.x;
							var posY = pointer.y;					
							updateNewEdge(posX,posY);
						}
					}
									
			},
			
			'object:moving': function (e) {  // vertex moves			
				// move edges when vertex moves and update vertex state
				e.target.object.move();
				displayJSON();
			}
		});
		
		//add keyboard events
		window.addEventListener( "keydown", doKeyDown, true);		
			
		adjustCanvasSize();
                        
        // make example graph
        graph = makeExample();
		initializeTokens();
		
		graph.draw();
        canvas.renderAll();
		
		displayJSON();
		
	});


	
})(jQuery)
