//onebit token propagation
var agentMode = 0;
var pointers = [];
var shifts = [];
var position = null;

//visualization
var edgeVisits = []; 
var prevCon = null;
var cycleColors = [];
var loops = 0;
var step = 0;



function addToken(vertex) {
	//remove existing agent
	if (position != null) {
		getVertexByID(position, graph.vertices).tokens = 0;
	}
	
	//add new one and erase previous states
	vertex.tokens = 1;	
	position = vertex.id;
	initializePointers();
	initializeEdges();
		
	graph.draw();
	canvas.renderAll();
}
//initialize everything with zero,  
function initializePointers () {
	for (var i = 0; i < graph.vertices.length; i++) {
		var id = graph.vertices[i].id;
		pointers[id] = 0;
		shifts[id] = 0;
		agentMode = 0;
	}
	//pointers[position] = 1;
}
function initializeEdges () {
	edgeVisits = [];
	
	for (var i = 0; i < graph.edges.length; i++) {
		edgeVisits[i] = 0;
	}
}
function resetSimulation () {
	var v = getVertexByID(position, graph.vertices);
	if (typeof v !== 'undefined') v.tokens = 0
	
	position = null;
	pointers = [];
	initializeEdges();
	
	graph.draw();
	canvas.renderAll();
	
	$("#playBtn").removeClass("disabled");
	$("#createBtn").removeClass("disabled");
	$("#pauseBtn").addClass("disabled");			
	playing = false;
	
}
function importExtendedJSON () {
	
}
function displayExtendedJSON () {
	
}
function createExample (param) {
	graph = makeExample(param.data);
	position = null;
	
	graph.draw();
    canvas.renderAll();
	displayJSON();
}
function simulation () {
	
	calcConnectionPoints(); 
	calcColors();
	loops = step = 0;
	
	// calculate next state and fire the animations 
		interval = setInterval(function() {
	
			step++;
			//simpleAgentPropagation();
			newAgentPropagation();
			
		}, 1200 / tokenSpeed);
		
		animate(); // updates canvas every frame
 	
}

// one step of the simulation, takes current vertex, returns the outgoing port number
function oneBit(v) {
	var tmp;
	
	if (pointers[v.id] == 2 * v.degree) {
		pointers[v.id] = 0;
		stop();
		return -1;
	}
	
	if (!agentMode && pointers[v.id] <= v.degree) {
		shifts[v.id] = pointers[v.id];
	}
	
	pointers[v.id]++;
	
	if (pointers[v.id] >= 1 && pointers[v.id] <= v.degree) {
		agentMode = 1;
		tmp = pointers[v.id];
	}
	else {
		agentMode = 0;
		tmp = pointers[v.id] + shifts[v.id];
		if (pointers[v.id] == 2 * v.degree && shifts[v.id] > 0) {
			shifts[v.id] = 0;
			pointers[v.id] = 0;
		}
	}
	
	return tmp % v.degree;	
}
function stop () {
	//stop the simulation
	pause();
}
function newAgentPropagation() {
	var currentVertex = getVertexByID(position, graph.vertices);
	
	var port = oneBit(currentVertex);
	if (port == -1) return;
	
	var nextVertex = currentVertex.neighbours[port];
	
	position = nextVertex.id;
	currentVertex.tokens = 0;
	nextVertex.tokens = 1;
	animateTokens(currentVertex, nextVertex, 1);
	//draw the path between
	setTimeout(function() {drawPath(currentVertex, nextVertex);}, 1000 / tokenSpeed);
}
function simpleAgentPropagation() {
	
	pointers[position]++;
	
	var currentVertex = getVertexByID(position, graph.vertices);
	
	if (pointers[position] == currentVertex.degree) {
		pointers[position] = 0;
	}
		
	var nextVertex = currentVertex.neighbours[pointers[position]];
	position = nextVertex.id;
	
	currentVertex.tokens = 0;
	nextVertex.tokens = 1;
	
	animateTokens(currentVertex, nextVertex, 1);
	
	//draw the path between
	setTimeout(function() {drawPath(currentVertex, nextVertex);}, 1000 / tokenSpeed);
}
function drawPath(from, to) {
	var edgeN;
	var edgeID;
	//find the necessary edge/neighbour number
	for (var i = 0; i < from.neighbours.length; i++) {
		if (to.id === from.neighbours[i].id) {
			edgeN = i;
			edgeID = from.edges[i].id;			
			break;
		}
	}
	var coef = 2 / nodeRadius;
	var curvature;
	
	switch (edgeVisits[edgeID]) {
		case 0: case 1: curvature = 0.05 + coef; break;
		case 2: case 3: curvature = 0.3 + coef; break;
		//case 4: case 5: curvature = 0.47 + coef; break;
		default: {
			//curvature = 0.47 + coef - (coef * 3 * Math.floor(edgeVisits[edgeID] / 2))/edgeVisits[edgeID]; break;
			curvature =  0.22 * (Math.pow(1.2, -Math.floor(edgeVisits[edgeID] / 2))) + coef + 0.1;
		}
	}
	
	setColor();
		
	if (prevCon !== null) drawInnerConnection(from, prevCon, edgeN);	
		
	prevCon = drawOuterConnection(from, edgeN, curvature).edgeN;
		
	edgeVisits[edgeID]++;
}

// gradually change color of the path
function setColor() {
	//how often to change color
	loops = Math.round(step / graph.vertices.length);
	
}
function calcColors() {
	cycleColors = ['#BA3030'];
	var colorStep = 0.05;
	
	// we are going to generate this many colors
	for (var i = 0; i < 1 / colorStep; i++) {
		var current = cycleColors[i];
		current = hexToRgb(current);
		var currentHsl = rgbToHsl(current.r, current.g, current.b);
		//change hue
		currentHsl[0] -= colorStep;
		if (currentHsl[0] < 0) currentHsl[0] = 1 + currentHsl[0];
		
		//convert back
		current = hslToRgb(currentHsl[0],currentHsl[1],currentHsl[2]);
		current = rgbToHex(current[0], current[1], current[2]);
		
		cycleColors.push(current);
	}
	
}

play = function () {
	//if no agent in the graph, do nothing
	if (position == null) return;
	
	$("#playBtn").addClass("disabled");
	$("#pauseBtn").removeClass("disabled");
	$("#createBtn").addClass("disabled");
	$("#randomizePorts").addClass("disabled");
	$("#orderPorts").addClass("disabled");
	playing = true;
		
	simulation();
}

pause = function () {
	$("#playBtn").removeClass("disabled");
	$("#createBtn").removeClass("disabled");
	$("#pauseBtn").addClass("disabled");
	$("#randomizePorts").removeClass("disabled");
	$("#orderPorts").removeClass("disabled");	
	playing = false;
		
	clearInterval(interval);
		
		//display the simulation state in json
		//displayExtendedJSON();
}


load = function () {
	
}
restartSimulation = function () {
	if ($("#playBtn").hasClass("disabled")) {
		$("#pauseBtn").removeClass("disabled");	
			simulation();
	}	
}


$(document).ready(function() {
		
		//controls
		$("#playBtn").click(play);
		$("#pauseBtn").click(pause);
		$("#createBtn").click(create);
		$("#loadBtn").click(load);
		
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
		
		graph.draw();
        canvas.renderAll();
		
		displayJSON();
		
	});