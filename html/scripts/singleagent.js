var position = null;
var pointers = [];

var cycleColors = ['#dc143c'];
var loops = 0;

function addToken(vertex) {
	//remove existing agent
	if (position != null) {
		getVertexByID(position, graph.vertices).tokens = 0;
	}
	
	//add new one and erase previous states
	vertex.tokens = 1;
	
	position = vertex.id;
	initializePointers();
	
	graph.draw();
	canvas.renderAll();
}
function initializePointers () {
	for (var i = 0; i < graph.vertices.length; i++) {
		var id = graph.vertices[i].id;
		pointers[id] = 0;
	}
	pointers[position] = 1;
}
function resetSimulation () {
	getVertexByID(position, graph.vertices).tokens = 0;
	position = null;
	pointers = [];
	
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
	
	// calculate next state and fire the animations 
		interval = setInterval(function() {
	
			
			simpleAgentPropagation();
			
		}, 1200 / tokenSpeed);
		
		animate(); // updates canvas every frame
 	
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
	//find the necessary edge/neighbour number
	for (var i = 0; i < from.neighbours.length; i++) {
		if (to.id === from.neighbours[i].id) {
			edgeN = i;
			break;
		}
	}
	
	//this.inConnections[edgeN] = p1;
	//this.outConnections[edgeN] = p2;	
	
	drawOuterConnection(from, edgeN);
		
	//function drawInnerConnection(vertex, conN) {
		
		//uses coordinate points
		//function drawConnection(from, to, middle) {
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