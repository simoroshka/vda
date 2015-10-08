// for token propagation
var totalVisits = [], //total visits for each vertex
	graphTokens = [], //tokens currently in each vertex
	newTokens = [],	  //token positions for the next step	
	moveTokens = [];  //how many tokens move from each vertex -
					  //to another (for animation)
					  
// for cycle detection and drawing
var statesToTime = {},  //map states to time stamps (simulation steps)
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
	
	function simulation () {	
		
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
	function normalTokenPropagation () {
			
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
	function fastTokenPropagation() {
		
		
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
	function detectCycles() {
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
	function rememberPath(from, to, tokens, timeStamp) {
		
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
	
	function getStateString () {
		var state = "";
		var v = graph.vertices.length;
		
		for (var i = 0; i < v; i++) {
			state += graphTokens[i];
			state += totalVisits[i] % graph.vertices[i].degree;
		}
		
		return state;		
	}
	// find pairs of incoming+outcoming flows. 
	function mapInOut() {
		graph.vertices.forEach(function(v) { v.pairFlows(); });
	}
	
//----------------------------------------------------------------------------
// control events 
//----------------------------------------------------------------------------
	
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
	
	// load simulation from JSON
	load = function () {
		importExtendedJSON($("#JSONext").val());
		graph.draw();
        canvas.renderAll();		
	}
	
	// restart simulation (after speed change, for example)
	restartSimulation = function () {
		if ($("#playBtn").hasClass("disabled")) {
			$("#pauseBtn").removeClass("disabled");	
			simulation();
		}			
	}
	
//----------------------------------------------------------------------------
// Token editing 
//----------------------------------------------------------------------------	
	// on place tokens - add tokens randomly
	placeTokens = function () {
		initializeTokens();
		randomTokens($("#tokenSlider").val());
		graph.draw();
		canvas.renderAll();	
	}
	
	// remove all tokens
	removeTokens = function () {		
		initializeTokens();
		graph.draw();
		canvas.renderAll();
		displayExtendedJSON();
	}
	
	// add token to a vertex
	function addToken(vertex) {
		graphTokens[vertex.id]++;
		vertex.tokens++;
		updateGraphTokens();
		
		resetSimulation();		
	}
	
	// change the amount of tokens (size) in a vertex
	function changeTokensManually(vertex, mouseX, mouseY) {				
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
	
//----------------------------------------------------------------------------
// drawing
//----------------------------------------------------------------------------
		
	// calculate appropriate token size
	function setTokenSize(amount) {
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
	function setTokenColor(amount) {
		
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
	function updateGraphTokens() {
		var total = 0;
		for (var i = 0; i < graphTokens.length; i++) {
			total += graphTokens[i];
		}
		
		setTokenSize(total);
		
		//will be recalculated as needed
		tokenRadiuses = [];
	}
	
	// helper function - amount to percentage on logarithmic scale
	function toLogScale(a, min, max) {
		if(max === min)
			return 0;
	
		var b = Math.log(max),
			c = (0 === min ? 0 : Math.log(min)),
			d = (0 === a ? 0 : Math.log(a));
			
		return (d-c)/(b-c);
	}

	
	
//----------------------------------------------------------------------------
// JSON 
//----------------------------------------------------------------------------	
	
	// load simulation state
	function importExtendedJSON(stringJSON) {
		
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
	// output current simulation in JSON
	function displayExtendedJSON() {
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
	
//----------------------------------------------------------------------------
// Initializing 
//----------------------------------------------------------------------------

	// initialize moveTokens array (used for animation)
	function initMovetokens () {
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
	function initializeTokens () {			
		
		var v = graph.vertices.length;
		
		// for each vertex
		for (var i = 0; i < v; i++) {	
			graph.vertices[i].tokens = 0;
			graphTokens[i] = 0;	
		}
		
		resetSimulation();
	}
	
	// reset the auxilary variables 
	function resetSimulation () {
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
	function randomTokens (amount) {
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
	function createExample (param) {
		graph = makeExample(param.data);
		initializeTokens();
		
		graph.draw();
        canvas.renderAll();
		displayJSON();
	}
	
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

