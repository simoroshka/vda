var VDA =(function($){
	var vertices = [],
		edges = [],
		canvas = null,
		context = null,
        exampleGraph = null,
		offsetX = 100,
		offsetY = 100;
		
	var nodeRadius = 15,
		tokenRadius = 3,
		tokenSpeed = 1;
		
	var totalVisits = [],
		graphTokens = [],
		newTokens = [];
		
// the classes ---------------------------------------------------------
	function Graph (vertices, edges) {
		if(typeof vertices == "undefined"){ vertices = [] };
        if(typeof vertices != "object"){ return false };
        if(typeof edges == "undefined"){ edges = [] };
        if(typeof edges != "object"){ return false };
        
		this.vertices = vertices;
        this.edges = edges;
        this.x = 0;
        this.y = 0;
		
        this.draw = function(){			
			edges.forEach(function(e) { e.draw(offsetX,offsetY); });			
			vertices.forEach(function(v) { v.draw(offsetX,offsetY); });
		};
	
	};
	
	function Vertex (id, x, y) {
		if(typeof id != "number"){ return false };
        if(typeof x != "number" || typeof y != "number"){ return false };
	
        this.id = id;        
		this.x = x;
        this.y = y; 
		
        this.degree = 0;
        this.edges = [];
		this.neighbors = [];
		
		this.tokens = 0;
		this.visited = 0;
        
		// creating fabric shape
		this.shape = new fabric.Circle({
			radius: nodeRadius,
			top: y - nodeRadius,
			left: x - nodeRadius,
			stroke: 'rgba(0,0,0,0.5)',
			strokeWidth: 2,
			fill: 'rgba(250,250,250,1.0)',
			hasBorders: false,
			lockRotation: true,
			cornerSize: 9,
			transparentCorners: false,
			centeredScaling: true,
			hasControls: false,
			selectable: false			
		});
		this.tokenShape = new fabric.Circle({
			radius: this.tokens,
			top: y,
			left: x,
			fill: 'rgba(255,0,0,1.0)',
			selectable: false	
		})
		
		this.updateTokens = function (number) {
			this.tokenShape.radius = number * 3;
			this.tokenShape.top = this.y + offsetX - number;
			this.tokenShape.left = this.x + offsetY - number;
			this.tokenShape.width = number * 6;
			this.tokenShape.height = number * 6;
			tokens = number;
		}				
		
        this.draw = function(offsetX, offsetY) {
			this.shape.top += offsetY;
			this.shape.left += offsetX;
			canvas.add(this.shape);		
			
			this.tokenShape.top += offsetY;
			this.tokenShape.left += offsetX;			
			canvas.add(this.tokenShape);
        };
		
		this.animateToken = function () {animateToken(
							//from this vertex
							this.x + offsetX, 			
							this.y + offsetY,
							//to a neighbour vertex
							this.neighbors[0].x + offsetX,
							this.neighbors[0].y + offsetY,
							//size of token
							this.tokens)};  		
		
	};
	
	function Edge (id, from, to) {
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
        from.neighbors.push(to);
		to.neighbors.push(from);
		
		
		//create line object
		this.shape = new fabric.Line(
			[from.x, from.y,
			to.x, to.y], {
			stroke: 'black',
			strokeWidth: 2, 
			hasBorders: false,
			lockRotation: true,
			lockScalingX: true,
			lockScalingY: true,
			lockMovementX: true,
			lockMovementY: true,
			hasControls: false
			}
		);
		console.log("created an edge");
		
		//add to canvas
        this.draw = function(offsetX, offsetY) {
			this.shape.top += offsetY;
			this.shape.left += offsetX;
			canvas.add(this.shape);
			
			console.log("added line")
        };
	};
	
	
	
// animation -----------------------------------------------------------
	function animateToken(fromX, fromY, toX, toY, size) {		
		var token = new fabric.Circle ({			
			radius: size,
			top: fromY - size,
			left: fromX - size,	
			strokeWidth: 2,
			stroke: 'rgba(250,0,0,1.0)',
			fill: 'rgba(250,0,0,1.0)',			
			selectable: false
		});
		canvas.add(token);
		canvas.renderAll();		
		
		token.animate({'left': toX - size, 'top': toY - size,}, {
				onChange: canvas.renderAll.bind(canvas),	//has to be changed to universal fps-based update
				onComplete: function() {
					canvas.remove(token)},
				duration: 1000 / tokenSpeed
			});
		
	}	
// simulation of the algorithm -----------------------------------------
	function simulation(graph) {	
		
		t = setInterval(function() {
			//make an algorithm step
			for (var v = 0; v < graph.vertices.length; v++) {
				for (var t = 0; t < graphTokens[v]; t++) {
					var d = totalVisits[v] % graph.vertices[v].degree;
					var u = graph.vertices[v].neighbors[d].id;
					newTokens[u]++;
					totalVisits[v]++;
				}			
			}
			for (var i = 0; i < graphTokens.length; i++) {
				graphTokens[i] = newTokens[i];
				newTokens[i] = 0;
				graph.vertices[i].updateTokens(graphTokens[i]);
			}
			canvas.renderAll();
			
		}, 500);
 	}
	

// page layout ---------------------------------------------------------
	function adjustCanvasSize() {
		canvas.setDimensions({
			width: $("#canvas-container").width(),
			height: $("#canvas-container").height()
		});
	};
	
	$(window).resize(adjustCanvasSize);
	
// Control events ------------------------------------------------------
	play = function() {
		
		$("#playBtn").addClass("disabled");
		$("#pauseBtn").removeClass("disabled");
		
		//move a token from a to b every 500 ms
	//	t1 = setInterval(function() {animateToken(100,100,200,100, tokenRadius)}, 1000/tokenSpeed*2);
	//	t2 = setInterval(function() {animateToken(200,100,100,100, tokenRadius)}, 1000/tokenSpeed*2);
		simulation(exampleGraph);
		
		
	}
	pause = function () {
		$("#playBtn").removeClass("disabled");
		$("#pauseBtn").addClass("disabled");
		//clearInterval(t1);
		clearInterval(t);
	}

// initialising --------------------------------------------------------
	$(document).ready(function() {
		//controls
		$("#playBtn").click(play);
		$("#pauseBtn").click(pause);
		
		//initialize canvas as fabric object
		canvas = new fabric.Canvas('canvas', {
			selection: false, 
			//renderOnAddRemove: false, //increases speed 
			moveCursor: 'default', 
			hoverCursor: 'default'
		});   	
		
		adjustCanvasSize();
                        
        // make example graph
        exampleGraph = makeExample();
		exampleGraph.draw();
        canvas.renderAll();
		
		//initialize tokens
		for (var i = 0; i < exampleGraph.vertices.length; i++) {
			graphTokens[i] = Math.round(Math.random()); //place some tokens randomly
			exampleGraph.vertices[i].updateTokens(graphTokens[i]);
			newTokens[i] = 0;
			totalVisits[i] = 0;
		}
		canvas.renderAll();
		
		
		
		//exampleGraph.vertices[0].animateToken();
		/*
		//animating three tokens moving at once
		animateToken(100,100,200,100);
		animateToken(200,100,100,200);
		animateToken(100,200,100,100);*/
		
		
	});
// Graph example -------------------------------------------------------	
    function makeExample () {
        
		exVertices = [];
		exEdges = [];
		var eID = 0;

		for (var i = 0; i < 3; i++) {
			for (var j = 0; j < 3; j++) {
				exVertices.push(new Vertex(3*i+j, 100*i, 100*j));
				if (j > 0) {
					exEdges.push(new Edge(++eID, exVertices[3*i + j-1], exVertices[3*i + j]));
				}
				if (i > 0) {
					exEdges.push(new Edge(++eID, exVertices[3*(i-1) + j], exVertices[3*i + j]));
				}
			}
		}
			
		for (var i = 0; i < exVertices.length; i++) {
			if (i == 0) {
				exVertices[i].updateTokens(15);		
				tokens[i] = 15;
			}
			else {
				exVertices[i].tokens = 0;
				tokens = 0;
			}
		}
			
		/*
		
        //arrays
        exVertices = [
            new Vertex(0, 100, 100),
            new Vertex(1, 200, 100),		//3*0+1
			new Vertex(2, 300, 100),		//3*0+2
			new Vertex(3, 100, 200),		//3*0+3
			new Vertex(4, 200, 200),		//3*1+1	
        ];
        exEdges = [
            new Edge(4, exVertices[0], exVertices[1]),
			new Edge(5, exVertices[1], exVertices[2]),
			new Edge(6, exVertices[2], exVertices[0])
			
        ];
        */
		console.log("creating example graph");
		
        return new Graph(exVertices, exEdges);
    };


	
})(jQuery)
