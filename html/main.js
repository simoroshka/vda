var VDA =(function($){
	var vertices = [],
		edges = [],
		canvas = null,
		context = null,
        exampleGraph = null;
		
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
			edges.forEach(function(e) { e.draw(); });			
			vertices.forEach(function(v) { v.draw(); });
		};
	
	};
	
	function Vertex (id, value, x, y) {
		if(typeof id != "number"){ return false };
        if(typeof value != "number" && typeof value != "string"){ return false };
        if(typeof x != "number" || typeof y != "number"){ return false };
	
        this.id = id;
        this.value = value;
        this.x = Math.round(x);
        this.y = Math.round(y); 
        //this.degree = 0;
        //this.edges = [];
        
		this.shape = new fabric.Circle({
			radius: value,
			top: y - value,
			left: x - value,
			stroke: 'rgba(0,0,0,0.5)',
			fill: 'rgba(250,250,250,1.0)'
		});
		console.log("created a vertex");
		
        this.draw = function() {
			canvas.add(this.shape);
			console.log("added circle")
        };
		
	};
	
	function Edge (id, value, from, to) {
		if(typeof id != "number"){ return false };
        if(typeof value != "number" && typeof value != "string"){ value = "" };
        if(typeof from != "object" || typeof to != "object"){ return false };
        
        this.id = id;
        this.value = value;
        this.from = from;
        this.to = to;        
        
		this.shape = new fabric.Line(
			[from.x, from.y,
			to.x, to.y], {
			fill: 'red',
			stroke: 'red',
			strokeWidth: 3      
			}
		);
		console.log("created an edge");
		
        this.draw = function(){
            canvas.add(this.shape);
			console.log("added line");
        };
		
	};
	
	

// page layout ---------------------------------------------------------
	function adjustCanvasSize() {
		canvas.setDimensions({
			width: $("#canvas-container").width(),
			height: $("#canvas-container").height()
		});
	};
	
	$(window).resize(adjustCanvasSize);

// initialising the document -------------------------------------------
	$(document).ready(function() {
		//initialize canvas as fabric object
		canvas = new fabric.Canvas('canvas', {
			selection: false, 
			//renderOnAddRemove: false, //increases speed 
			moveCursor: 'default', 
			hoverCursor: 'default'
		});   	
		
		adjustCanvasSize();
                        
        // Example
        exampleGraph = makeExample();
		exampleGraph.draw();
		console.log("rendering canvas");
        canvas.renderAll();

	});
// Graph example -------------------------------------------------------	
    function makeExample () {
        
        //arrays
        exVertices = [
            new Vertex(1, 20, 100, 100),
            new Vertex(2, 30, 200, 100),
			new Vertex(3, 25, 100, 200)			
        ];
        exEdges = [
            new Edge(4, "", exVertices[0], exVertices[1]),
			new Edge(5, "", exVertices[1], exVertices[2]),
			new Edge(6, "", exVertices[2], exVertices[0])
			
        ];
        
		console.log("creating example graph");
        return new Graph(exVertices, exEdges);
    };


	
})(jQuery)
