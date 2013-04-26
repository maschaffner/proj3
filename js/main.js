// all data from boston_for_sale.csv
var data_for_sale = new Array();
// all data from boston_sold.csv
var data_sold = new Array();
// references which array the user is working with at any moment
var selected_array = new Array();

var xScale,yScale,currentZip=0;

// the sum of all home prices for each zip code in our data set
var prices = new Array();
// the count of all home listings for each zip code in our data set
var counts = new Array();
// the max home price for each zip code in our data set
var maxes = new Array();
// the min home price for each zip code in our data set
var mins = new Array();
// the sum of all home zestimates for each zip code in our data set
var zestimates = new Array();

// our zip code lookup values data set (includes geo coordinates)
var zips = JSON.parse(document.getElementById("zips").value);

// zip code lat/lng coordinates in json format
var zips_coords = JSON.parse(document.getElementById("zips_coordinates").value);

// contains the google maps polygons to be overlaid on our map
var polygons = new Array();

// google maps map container
var map = "";

// gradual fill colors for zip code areas
var colors = new Array();

// tracks polygon colors
var polygon_colors = new Array();

$(function() {
    $( "#controls" ).draggable();
});

function toggleFilters() {
	$("#controls").toggle();
    if (d3.select("#toggleFilters").text != "Hide Filters") {
        $("#toggleFilters").text = "Hide Filters";
    } else {
        $("#toggleFilters").text = "Show Filters";
    }
}

/** creates the google map and calls for the polygons to be created */
function drawMap() {
	// center of map
	var center = new google.maps.LatLng(42.316610, -71.060597);
	// map options to initialize with
	var mapOptions = {
	// the terrain map is initially centered at boston with a zoom level of 13
	center: center,
	zoom: 12,
	mapTypeId: google.maps.MapTypeId.TERRAIN
	};

	// map references the corresponding div placeholder
	map = new google.maps.Map(document.getElementById("map-canvas"),
	mapOptions);

	// plot the zip code polygons on the map
	layPolygons();
}

// returns an array of google latlng objects based on the given zip's polygon coordinates
function getZipPolygonCoords(zip) {
	// temp array to be returned
	var coords_array = new Array();
	
	for (var i in zips_coords) {
		if(zips_coords[i].zip == zip) {
			for(var j in zips_coords[i].values) {
				var lnglat = zips_coords[i].values[j].lnglat.split(" ");
				lng = lnglat[0];
				lat = lnglat[1];
				coords_array.push(new google.maps.LatLng(lat,lng));
			}
		}
	}
	return coords_array;
}

/** filters the data based on selected controls and calls for a "redraw" of the map */
function filter(changeChart) {
	// clear all output arrays
	clearBuckets();

	// get all checkboxes from our controls
	var checkboxes = document.getElementsByTagName("input");

	// numbers of bedrooms selected
	var bedrooms = new Array();
	// numbers of baths selected
	var baths = new Array();

	// value of minimum sqft entered by user
    var min_sqft = parseInt($("#slider-range-sqft").slider("values",0));
	// value of maximum sqft entered by user
    var max_sqft = parseInt($("#slider-range-sqft").slider("values",1));

	// value of minimum year entered by user
    var min_year = parseInt($("#slider-range-year").slider("values",0));
	// value of maximum year entered by user
    var max_year = parseInt($("#slider-range-year").slider("values",1));

	// value of minimum year entered by user
    var min_price = parseInt($("#slider-range-price").slider("values",0));
	// value of maximum year entered by user
    var max_price = parseInt($("#slider-range-price").slider("values",1));
	
	// references the "for sale" radio button
	var for_sale = document.getElementById("forsale");
	// references the "sold" radio button
	var sold = document.getElementById("sold");

	// selected_array will take a copy of either the "for sale" array or the "sold array" based on user input
	if (for_sale.checked == true) {
		selected_array = data_for_sale;
		} else if(sold.checked == true){
		selected_array = data_sold;
	}

    
	// populate bedrooms array
	for(var i in checkboxes) {
		if(checkboxes[i].className == "bedrooms") { 
			if(checkboxes[i].checked) {
				bedrooms.push(checkboxes[i].value);
			}
		}
	}

	// populate baths array
	for(var i in checkboxes) {
		if(checkboxes[i].className == "baths") { 
			if(checkboxes[i].checked) {
				baths.push(checkboxes[i].value);
			}
		}
	}

	// populate output arrays based on filter variables
	loadBuckets(selected_array,bedrooms,baths,min_sqft,max_sqft,min_year,max_year,min_price,max_price);
    
    // if the radio button "for sale" or "sold" was toggled, update the scatterplot and timeline
    // otherwise, just filter the data
    if (changeChart==1) {
        updateChartData(selected_array);
    }
    else if (changeChart==2) {
        // recreate scatterplot
        createPricePerSqFtScatterplot(selected_array);
        updateChartData(selected_array);
    }
    
    // now create the sales history frequency chart/timeline
    createTimeline(currentZip);
    
	
    if (changeChart==2) {
        // clear out details on demand div
        document.getElementById("detailsZip").innerHTML = "";
        d3.select("#bar_help").text("[ PLEASE SELECT A ZIP CODE FOR DETAILS ]");
    
        // clear out bullet graph
        clearBarChart();
    }
	
	// if map is loaded, redraw polygons
	if(map) {
		clearPolygons();
		layPolygons();
	} 
}

/** clears out bullet graph */
function clearBarChart() {
	document.getElementById("bar").innerHTML = "";
}	

/** draws the polygons onto the google map */
function layPolygons() {

	for (var i in zips_coords) {
			// zip area polygon coordinates
			var zipCoords = getZipPolygonCoords(zips_coords[i].zip);

			// zip area polygon
			var zipArea = new google.maps.Polygon({
				paths:zipCoords,
				strokeColor: "black",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: getFillColor(zips_coords[i].zip),
				fillOpacity: 0.6
			  });
			  
			zipArea.setMap(map);
			
			// add an event listener to each zip area
			google.maps.event.addListener(zipArea,'click', selectZipArea(zipArea,zips_coords[i].zip));
			
			// add polygon to polygons array
			polygons.push(zipArea);
			
			// add polygon colors
			polygon_colors.push(zipArea.fillColor);
	}
}

/** 
	callback function when clicking on a google map polygon (i.e. zip code) 
	fills the selected zip area with a predefined color and updates the bullet graph and scatterplot
*/
function selectZipArea(zipArea,zip) {
	return function() {
		for(var i in polygons) {
			// remove all polygons off the map, reset their color to red, then lay them back on map
			polygons[i].setMap(null);
			polygons[i].fillColor = polygon_colors[i];
			polygons[i].setMap(map);
		}
		
		// remove selected zip code area off the map
		zipArea.setMap(null);
		
		// change the color of the select zip code area
		zipArea.fillColor = "BF812D";
		
		// put the zip code polygon back on the map
		zipArea.setMap(map);
		
		// output details on demand in designated div
		showDetails(zip);
		
		// create bars
		barChart(zip);

		//PASS THE ZIP CODE TO SCATTER PLOT BELOW
		updateChartZip(zip);
        
        // recreate the sales history frequency chart
        createTimeline(zip);
        currentZip=zip;
	}
}

/** loads the details of the zip code into the designated div */
function showDetails(zip) {
	document.getElementById("detailsZip").innerHTML = getDetails(zip);
}

/** gets the name of the zip locale */
function getZipName(zip) {
	for(var i in zips.values) {
		if(parseInt(zips.values[i].zip) == parseInt(zip)) {
			return zips.values[i].name;
		}
	}
}

/** 
	return dollar amounts to contain commas 
	Borrowed from: http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
*/
function withCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** returns html markup for details on demand, based on user input */
function getDetails(zip) {
	var text = "<span class='label'>Zip Code: </span><span class='value'>" + "0" + zip + " (" + getZipName(zip) + ")" + "</span>";
	if(document.getElementById("count").checked) {
		var num_listings = text + "<br />" + "<span class='label'>Number of listings:</span> " + "<span class='value'>" + counts[zip] + "</span>";
		return num_listings;
	} else if (document.getElementById("average").checked) {
		var average = text + "<br /><span class='label'>" + "Average price:</span> " + "<span class='value'>$" + withCommas(parseInt(prices[zip]/counts[zip])) + "</span>";
		return average;
	} else if (document.getElementById("max").checked) {
		var maximum = text + "<br /><span class='label'>" + "Maximum price:</span> " + "<span class='value'>$" + withCommas(maxes[zip]) + "</span>";
		return maximum;
	} else if (document.getElementById("min").checked) {
		var minimum = text + "<br /><span class='label'>" + "Minimum price:</span> " + "<span class='value'>$" + withCommas(mins[zip]) + "</span>";
		return minimum;
	}
}

/** returns the fill color based on the home price */
function getFillColor(zip) {
	if(document.getElementById("count").checked) {
		var num_listings = counts[zip];
		if(num_listings > 0 && num_listings <= 50) {
			return colors[0];
		} else if(num_listings > 50 && num_listings <= 100) {
			return colors[1];
		} else if(num_listings > 100 && num_listings <= 200) {
			return colors[2];
		} else if(num_listings > 200 && num_listings <= 300) {
			return colors[3];
		} else if(num_listings > 300) {
			return colors[4];
		} else {
			return "transparent";
		}
	} else if (document.getElementById("average").checked) {
		var average = ((prices[zip]/counts[zip]));
		if(average > 0 && average <= 250000) {
			return colors[0];
		} else if(average > 250000 && average <= 500000) {
			return colors[1];
		} else if(average > 500000 && average <= 1000000) {
			return colors[2];
		} else if(average > 1000000 && average <= 3000000) {
			return colors[3];
		} else if(average > 3000000) {
			return colors[4];
		} else {
			return "transparent";
		}
	} 
}

/** clears all the polygons off the map */
function clearPolygons() {
	for(var polygon in polygons) {
		// remove polygon off map
		polygons[polygon].setMap(null);
	}

	// reset polygons array so that we can repopulate it
	polygons = new Array();
	polygon_colors = new Array();
}

/** loads all of our content from 2 csv files */
function initialize() {

/* GRAY
    colors.push("#EEEEEE");
    colors.push("#CCCCCC");
    colors.push("#AAAAAA");
    colors.push("#777777");
    colors.push("#444444");

/* PURPLE
    colors.push("#BCBDDC");
    colors.push("#9E9AC8");
    colors.push("#807DBA");
    colors.push("#6A51A3");
    colors.push("#4A1486");

/* GREEN */
    colors.push("#F5F5F5");
    colors.push("#C7EAE5");
    colors.push("#80CDC1");
    colors.push("#35978F");
    colors.push("#01665E");

/* BLUE 
    colors.push("#9ECAE1");
    colors.push("#6BAED6");
    colors.push("#4292C6");
    colors.push("#2171B5");
    colors.push("#004090");
    
/*  ORANGE 
	colors.push("#FEE391");
	colors.push("#FEC44F");
	colors.push("#FE9929");
	colors.push("#CC4C02");
	colors.push("#8C2D04");
/*  PINKISH
    colors.push("#FEEBE2");
	colors.push("#FBB4B9");
	colors.push("#F768A1");
	colors.push("#C51B8A");
	colors.push("#7A0177");
*/
	d3.csv("data/boston_for_sale.csv", function(d) {
		// populate "homes for sale" array
		data_for_sale = d;
        
        // create initial scatterplot
        createPricePerSqFtScatterplot(data_for_sale);
		
        initBarChart(data_for_sale);
	});

	
    d3.csv("data/boston_sold.csv", function(d) {

        // get the dates of sale into a format that Javascript date object recognizes 
        d.forEach(function(d) {
            tempArray = d.dateofsale.split("/");
            d.dateofsale = new Date("20" + tempArray[2], tempArray[0], tempArray[1]);
        });

		// populate "homes sold" array
		data_sold = d;
        
        // calls all filters to be applied to newly created map
		filter(1); 		
	
		// calls for map to be drawn, since this is our default option
		drawMap();
	});
}

/** clears all of our output arrays */
function clearBuckets() {
	prices = [];
	counts = [];
	maxes = [];
	mins = [];
	zestimates = [];		
}

/** loads a given home listing into the corresponding output arrays */
function loadListing(zip,price, zestimate) {
	// if the zip code for this home has not been registered yet
	if(prices[zip] == null) {
		prices[zip] = 0;
        zestimates[zip] = 0;
		counts[zip] = 0;
		maxes[zip] = 0;
		mins[zip] = 100000000;
		prices[zip] = parseInt(prices[zip]) + parseInt(price);
		zestimates[zip] = parseInt(zestimates[zip]) + parseInt(zestimate);
        counts[zip]++;
		if(mins[zip] >= parseInt(price)) {
			mins[zip] = parseInt(price);
		}
		if(maxes[zip] <= parseInt(price)) {
			maxes[zip] = parseInt(price);
		}
	// if this zip code for this home already exists in our arrays
	} else {
		prices[zip] = parseInt(prices[zip]) + parseInt(price);
		zestimates[zip] = parseInt(zestimates[zip]) + parseInt(zestimate);
		counts[zip]++;
		if(mins[zip] >= parseInt(price)) {
			mins[zip] = parseInt(price);
		}
		if(maxes[zip] <= parseInt(price)) {
			maxes[zip] = parseInt(price);
		}
	}		
}

/** populates our output arrays given the set of filters selected by user */
function loadBuckets(d,beds,baths,min_sqft,max_sqft,min_year,max_year,min_price,max_price) {
	// flags if at least 1 bedroom has been selected
	var bed_criterion = 0;
	// flags if at least 1 bathroom has been selected
	var bath_criterion = 0;
	// flags if squared footage has been selected
	var sqft_criterion = 0;
	// flags if at least 1 year has been selected
	var year_criterion = 0;
	// flags if price has been selected
	var price_criterion = 0;
	
	// for each home listing in the selected array
	for (var listing in selected_array) {
		// check how many bedrooms were selected
		for (var bed in beds) {
			if(parseInt(beds[bed]) == parseInt(selected_array[listing].beds)) {
				bed_criterion = 1;
			} else if(parseInt(beds[bed]) == "5+" && parseInt(selected_array[listing].beds) >= 6) {
				bed_criterion = 1;
			} 
		}

		// check how many baths were selected
		for (var bath in baths) {
			if(parseInt(baths[bath]) == Math.floor(parseInt(selected_array[listing].baths))) {
				bath_criterion = 1;
			} else if(parseInt(baths[bath]) == "5+" && parseInt(selected_array[listing].baths) >= 6) {
				bath_criterion = 1;
			} 
		}

		// check if home listing falls within selected squared footage range
		if (parseInt(selected_array[listing].sqft) >= parseInt(min_sqft) && parseInt(selected_array[listing].sqft) <= parseInt(max_sqft)) {
			sqft_criterion = 1;
		}

		// check if home listing falls within selected year built range
		if (parseInt(selected_array[listing].yearbuilt) >= parseInt(min_year) && parseInt(selected_array[listing].yearbuilt) <= parseInt(max_year)) {
			year_criterion = 1;
		}
		
		// check if home listing falls within selected price range
		if (parseInt(selected_array[listing].price) >= parseInt(min_price) && parseInt(selected_array[listing].price) <= parseInt(max_price)) {
			price_criterion = 1;
		}

		// check if the necessary filters were selected to cause a meaningful query
		if (bed_criterion == 1 && bath_criterion == 1 && sqft_criterion == 1  && price_criterion == 1) {
			loadListing(selected_array[listing].zip,selected_array[listing].price,selected_array[listing].zestimate);
		} 

		// reset criteria flags
		bed_criterion = 0;
		bath_criterion = 0;
		sqft_criterion = 0;
		year_criterion = 0;
		price_criterion = 0;
	}
}

function initBarChart() {

    $("#bar").html("");
	selected = "";    
    if (document.getElementById("forsale").checked == true) {
		selected = "for_sale";
	} else if (document.getElementById("sold").checked == true) {
		selected = "sold";
	}
    // average actual price for boston
	avg_actual_all = getForSaleStats(selected)[1];
	// average zestimate price for boston
	avg_zestimate_all = getForSaleStats(selected)[2];

	document.getElementById("detailsBoston").innerHTML = "<span class='label'>Average Price (Boston):</span><br/><span class='valueBoston'>$"+withCommas(avg_actual_all)+"</span>";

   	// scale our range to maximum price of boston, and the range of the height of the bar chart
	currentMaxBarHeight = d3.max([avg_actual_all,avg_zestimate_all]);
    var scale =	d3.scale.linear().domain([0,currentMaxBarHeight]).range([0,210]);
    
    var bars = d3.select("#bar").selectAll("div").data([scale(avg_actual_all)]);
    bars.enter().append("div")
        .attr("class","avg_boston")
		.style("top","223px")
        .transition().duration(700)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Price (Boston):<br/> $" + withCommas(avg_actual_all)+"');"})
            .attr("onmouseout","tooltip.hide();");
			
    d3.select("#bar").data([scale(avg_zestimate_all)]).append("div")
        .attr("class","avg_zestimate")
		.style("top","223px")
        .transition().duration(800)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Zestimate (Boston):<br/> $" + withCommas(avg_zestimate_all)+"');"})
            .attr("onmouseout","tooltip.hide();");
    
    currentMaxBar = d3.select("#bar")
        .append("div");
    currentMaxBar
        .attr("id","currentMaxBar")
        .style("top","220px")
        .transition().duration(700)
            .style("top","-9px");
    d3.select("#currentMaxBar").append("span")
                .style("opacity","0.6")
                .style("background","white")
                .text("$" + withCommas(scale.domain()[1]));
}

/** creates a bar chart of actual versus project price based on selected zip code */
function barChart(zip) {

	// clear bart chart
	$("#bar").html("");
	selected = "";
	
	if (document.getElementById("forsale").checked == true) {
		selected = "for_sale";
	} else if (document.getElementById("sold").checked == true) {
		selected = "sold";
	}
	

	// scale actual price amount
	price = parseInt(parseInt(prices[zip])/parseInt(counts[zip]));

	// scale zestimate amount
	zestimate = parseInt(parseInt(zestimates[zip])/parseInt(counts[zip]));
	// price data array to be passed to d3
	//price = [price];
	// zestimate data array to be passed to d3
	//zestimate = [zestimate];
	
	// average actual price for boston
	avg_actual_all = getForSaleStats(selected)[1];
	
	// average zestimate price for boston
	avg_zestimate_all = getForSaleStats(selected)[2];

   	// scale our range to maximum price of boston, and the range of the height of the bar chart
	currentMaxBarHeight = d3.max([price,zestimate,avg_actual_all,avg_zestimate_all]);
    var scale =	d3.scale.linear().domain([0,currentMaxBarHeight]).range([0,210]);	
    
    d3.select("#bar").selectAll("div").data([scale(avg_actual_all)]).enter().append("div")
        .attr("class","avg_boston")
		.style("top","223px")
        .transition().duration(700)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Price (Boston):<br/> $" + withCommas(avg_actual_all)+"');"})
            .attr("onmouseout","tooltip.hide();");
			
    d3.select("#bar").data([scale(price)]).append("div")
        .attr("class","avg_zip")
		.style("top","223px")
        .transition().duration(700)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Price (0" + zip + "):<br/> $" + withCommas(price)+"');"})
            .attr("onmouseout","tooltip.hide();");
			
    d3.select("#bar").data([scale(avg_zestimate_all)]).append("div")
        .attr("class","avg_zestimate")
		.style("top","223px")
        .transition().duration(800)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Zestimate (Boston):<br/> $" + withCommas(avg_zestimate_all)+"');"})
            .attr("onmouseout","tooltip.hide();");
			
    d3.select("#bar").data([scale(zestimate)]).append("div")
        .attr("class","avg_zestimate_zip")
		.style("top","223px")
        .transition().duration(900)
            .style("height",function(d){return d+"px"})
            .style("top",function(d) {return parseInt(220-d)+"px"})
            .attr("onmousemove",function(d) {return "tooltip.show('Average Zestimate (0" + zip + "):<br/> $" + withCommas(zestimate)+"');"})
            .attr("onmouseout","tooltip.hide();");
	
    //d3.select("#bar_help").text("");
    
    currentMaxBar = d3.select("#bar")
        .append("div");
    currentMaxBar
        .attr("id","currentMaxBar")
        .style("top","220px")
        .transition().duration(700)
            .style("top","-9px");
    d3.select("#currentMaxBar").append("span")
                .style("opacity","0.6")
                .style("background","white")
                .text("$" + withCommas(scale.domain()[1]));
                
	// show bar labels
	//$("#bar_help").show();
}

/** returns an array of max, actual average, and zestimate for the listings of boston */
function getForSaleStats(type) {
	var max = 0;
	var price_sum = 0;
	var zestimate_sum = 0;
	var average_price = 0;
	var average_zestimate = 0;
	var selected = "";
	var stats = new Array();
	
	if (type == "for_sale") {
		selected = data_for_sale; 
	} else if (type == "sold") {
		selected = data_sold;
	}

	var count = selected.length;
    
	for (var i in selected) {
		if(parseInt(selected[i].price) >= max) {
			max = parseInt(selected[i].price);
		}
		price_sum += parseInt(selected[i].price);
		zestimate_sum += parseInt(selected[i].zestimate);
	}
	
	average_price = parseInt(price_sum/count);
	average_zestimate = parseInt(zestimate_sum/count);
	
	stats.push(max);
	stats.push(average_price);
	stats.push(average_zestimate);
	
	return stats;
}


/** creates the price-per-foot scatterplot  */
function createPricePerSqFtScatterplot(data_in) {
        var margin = {top: 20, right: 20, bottom: 40, left: 100},
            width = 500 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

		// create an svg object with width and height
		var svgDiv = d3.select("body").select("#pricePerSqFt");
        svgDiv
            .select("svg").remove();
        var svg = svgDiv.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("id","svgScatter")
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
        var minSqFt = parseInt($("#slider-range-sqft").slider("values",0));
        var maxSqFt = parseInt($("#slider-range-sqft").slider("values",1));
        var minPrice = parseInt($("#slider-range-price").slider("values",0));
        var maxPrice = parseInt($("#slider-range-price").slider("values",1));
        
		// create circles based on our json data. note that this is only for the append operation
		// in actual vis we'd have to also specify code for update and exit
        // MS: the above comment doesn't apply, since we are only setting the visibility attribute
		var circles = svg.selectAll("circle")
						 .data(data_in)
						 .enter()
						 .append("circle");
		
        xScale = d3.scale.linear()
            .range([0, width])
            .domain([minSqFt,maxSqFt]);

        yScale = d3.scale.linear()
            .range([height,0])
            .domain([minPrice,maxPrice]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(5);
            
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");

        var downx = Math.NaN;
        var downscalex;

		svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
            .append("text")
              .attr("y", 36)
              .attr("x", 100)
              .text("Square Footage (Sq Ft)");
        svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", -90)
              .attr("x",-200)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("Price ($)");
        
        circles
            //tooltip code from: sixrevisions.com 
            .attr("onmousemove",function(d) {return "tooltip.show('" + listingToDetailsString(d)+"');"})
            .attr("onmouseout","tooltip.hide();")
            .attr("cx",function(d) {
                return xScale(parseInt(d.sqft));
            })
		    .attr("cy",function(d) { 
                return yScale(parseInt(d.price));			
            })
			// radius of the circles
            .attr("r","4")
            .attr("fill-opacity","0.4")
			// fill color of the circles
            .attr("stroke","#01665E")
            .attr("fill","#80CDC1");
}

function updateChartScale(dataIn) {
    var svg = d3.select("#pricePerSqFt").select("svg");
    d3.select("#pricePerSqFt").select("g.x.axis")
        .transition()
            .call(d3.svg.axis().scale(xScale).orient("bottom").ticks(5));
    
    svg
        .selectAll("circle")
        .data(dataIn)
        .transition()
            .attr("cx",function(d) {return xScale(parseInt(d.sqft))})
            .attr("cy",function(d) {return yScale(parseInt(d.price))});
            
    
    // now set all slider values to match the updated scatterplot ranges
    $("#slider-range-sqft").slider("values",0,xScale.domain()[0]);
    $("#slider-range-sqft").slider("values",1,xScale.domain()[1]);
}

/** updates the chart given a selected data */
function updateChartData(dataIn) {

    var minSqFt = parseInt($("#slider-range-sqft").slider("values",0));
    var maxSqFt = parseInt($("#slider-range-sqft").slider("values",1));
    var minPrice = parseInt($("#slider-range-price").slider("values",0));
    var maxPrice = parseInt($("#slider-range-price").slider("values",1));
    var minYear = parseInt($("#slider-range-year").slider("values",0));
    var maxYear = parseInt($("#slider-range-year").slider("values",1));
    
    // get all checkboxes from our controls
	var checkboxes = document.getElementsByTagName("input");
    
    var bedrooms = new Array();
    var baths = new Array();
    
    // populate bedrooms and bathrooms array
	for(var i in checkboxes) {
		if(checkboxes[i].className == "bedrooms") { 
			if(checkboxes[i].checked) {
				bedrooms.push(checkboxes[i].value);
			}
		} else if(checkboxes[i].className == "baths") {
            if(checkboxes[i].checked) {
				baths.push(checkboxes[i].value);
			}
        }
	}
        
    xDomain = [minSqFt,maxSqFt];
    yDomain = [maxPrice,minPrice];

    var xScale = d3.scale.linear()
        .domain(xDomain)
        .range([0,380]);
    var yScale = d3.scale.linear()
        .domain(yDomain)
        .range([0,240]);
    
   var svg = d3.select("body").select("#pricePerSqFt").selectAll("circle")
        .data(dataIn).each(function(d) {
        d3.select(this)
        .transition().duration(1000)
        //tooltip code from: sixrevisions.com 
            .attr("onmousemove","tooltip.show('" + listingToDetailsString(d)+"');")
            .attr("onmouseout","tooltip.hide();")
            .attr("cx",xScale(d.sqft))
		    .attr("cy",yScale(d.price))
            .attr("visibility", function(d) {return d.price > minPrice && d.price < maxPrice && d.sqft > minSqFt && d.sqft < maxSqFt && bedrooms.indexOf(String(d.beds))>=0 && baths.indexOf(String(d.baths))>=0  ? "visible" : "hidden"});
        });
    d3.select("#pricePerSqFt").select("g.x.axis")
        .transition().duration(1000)
            .call(d3.svg.axis().scale(xScale).orient("bottom").ticks(5));
    d3.select("#pricePerSqFt").select("g.y.axis")
        .transition().duration(1000)
            .call(d3.svg.axis().scale(yScale).orient("left"));
}

/** applies style to scatterplot circles that pertain to selected zip code */
function updateChartZip(zip) {
    
   var svgPlot = d3.select("body").select("#pricePerSqFt").selectAll("circle")
    .each(function(d) {
        if (d.zip == zip) {
            this.parentNode.appendChild(this);
            d3.select(this)                
                .attr("stroke", "black")
                .attr("fill", "#BF812D")
                .attr("fill-opacity","0.7")
                .transition().duration()
                    .attr("r", "5");
        }
        else {
            d3.select(this)
            .attr("stroke","#01665E")
            .attr("fill","#80CDC1")            
            .attr("fill-opacity","0.2")
            .attr("stroke-opacity","0.5")
            .transition().duration()
                    .attr("r", "4");
        }
    });
}

function createTimeline(zipcode) {
    // first get all filtering from the controls
    var minSqFt = parseInt($("#slider-range-sqft").slider("values",0));
    var maxSqFt = parseInt($("#slider-range-sqft").slider("values",1));
    var minPrice = parseInt($("#slider-range-price").slider("values",0));
    var maxPrice = parseInt($("#slider-range-price").slider("values",1));
    var minYear = parseInt($("#slider-range-year").slider("values",0));
    var maxYear = parseInt($("#slider-range-year").slider("values",1));
    
    // get all checkboxes from our controls
	var checkboxes = document.getElementsByTagName("input");
    
    var bedrooms = new Array();
    var baths = new Array();
    
    // populate bedrooms and bathrooms array
	for(var i in checkboxes) {
		if(checkboxes[i].className == "bedrooms") { 
			if(checkboxes[i].checked) {
				bedrooms.push(checkboxes[i].value);
			}
		} else if(checkboxes[i].className == "baths") {
            if(checkboxes[i].checked) {
				baths.push(checkboxes[i].value);
			}
        }
	}

    var beginDate = new Date("2010 12 31");
    var endDate = new Date("2013 04 20");
    
    //filter timeline by the criteria given
    var i = 0;
    var filteredSoldListings = [];
    var j = 0;
    var filteredZipSoldListings = [];
    
    data_sold.forEach(function(d) {
            if (d.price > minPrice && d.price < maxPrice && d.sqft > minSqFt && d.sqft < maxSqFt && bedrooms.indexOf(String(d.beds))>=0 && baths.indexOf(String(d.baths))>=0)
            { 
                filteredSoldListings[i] = d;
                i++;
            }
            // prepare the zip histogram (if no zip, it will consist of all 0's)
            if (d.price > minPrice && d.price < maxPrice && d.sqft > minSqFt && d.sqft < maxSqFt && bedrooms.indexOf(String(d.beds))>=0 && baths.indexOf(String(d.baths))>=0 && d.zip == zipcode)
                { 
                    filteredZipSoldListings[j] = d;
                    j++;
                }            
    });
    
    // initialize our range of dates, scales, and define that we want weeks 
    var dateRange = [beginDate,endDate];
    var binner = d3.time.scale();
    var interval = d3.time.week;
    var allIntervals = interval.range(interval.floor(dateRange[0]),interval.ceil(dateRange[1]));
    //console.log("Intervals", allIntervals);
    
    //set up the domain and range of this time scale
    binner
        .domain([allIntervals[0],allIntervals[allIntervals.length-1]])
        .range([0,allIntervals.length-1])
        .interpolate(d3.interpolateRound)
        .clamp(true);

    // create a blank histogram
    var hist=[];
    for(var i=0;i<allIntervals.length;i++) hist[i] = new Array(3);
    for(var i=0;i<allIntervals.length;i++) hist[i][0] = 0;
    for(var i=0;i<allIntervals.length;i++) hist[i][2] = 0;

    // create a blank histogram for the Zipcode
    var histZip=[];
    for(var i=0;i<allIntervals.length;i++) histZip[i] = new Array(3);
    for(var i=0;i<allIntervals.length;i++) histZip[i][0] = 0;
    
    var j=new Array(filteredSoldListings.length);
    for(var i=0;i<j.length;i++) j[i] = 0;
    
    // then populate the histogram
    filteredSoldListings.forEach(function(d) {
        var tid=binner(interval.floor(d.dateofsale));
        if (!hist[tid][0]) {
            hist[tid][0] = 1;
            hist[tid][1] = interval.floor(d.dateofsale);
            hist[tid][2] = parseInt(d.price);
            j[tid]=1;
        }
        else {
            hist[tid][0]++;

            // get new average of prices for that date
            //console.log(hist[tid][2] +","+ j[tid]+","+d.price);                
            hist[tid][2] = hist[tid][2]*j[tid];
            j[tid]++;
            hist[tid][2] = Math.round((hist[tid][2]+parseInt(d.price))/j[tid]);
        }
    });
    
    // then populate the zip histogram
    filteredZipSoldListings.forEach(function(d) {
        var tid=binner(interval.floor(d.dateofsale));
        if (!histZip[tid][0]) {
            histZip[tid][0] = 1;
            histZip[tid][1] = interval.floor(d.dateofsale);
            histZip[tid][2] = parseInt(d.price);
            j[tid]=1;
        }
        else {
            histZip[tid][0]++;
            if (d.price>1) {
                histZip[tid][2] = histZip[tid][2]*j[tid];
                j[tid]++;
                histZip[tid][2] = Math.round((histZip[tid][2]+parseInt(d.price))/j[tid]);
            }
        }
    });
    
    var numberOfSales=1;
    
    // create the proportion lines
    // first get the extent of the range and evenly divide it into 4 segments
    d3.select("#timelineLabel").selectAll("div.chartjunkDiv")
        .data([60,30])
        .enter().append("div")
            .attr("class", "chartjunkDiv")
            .style("top",function(d) {return String(parseInt(92-d))+"px"})
            .text(function(d) {return d});
    
    // first build/update the regular frequency chart
        d3.select("#timeline").selectAll("div.histDiv")
            .data(hist.slice(1))
            .enter().append("div")
                .style("top","0px")
                .attr("class","histDiv");
        d3.select("#timeline").selectAll("div.histDiv")
            .style("left",function(d,i) {return String(i*7)+"px"})
            .style("width","5px")
            .attr("onmousemove",function(d,i) {
                if (numberOfSales) {
                    return "this.id='divHover';tooltip.show('Week of: " + String(d[1]).substring(4,16) +"<br/>" + d[0]+ " listings sold in Boston');"
                } else {
                    return "this.style.background='darkblue';tooltip.show('Week of: " + String(d[1]).substring(4,16) +"<br/>Average sale price: " + withCommas(d[2]) + "');"
                }
            })
            .attr("onmouseout",function(d,i) {return "this.id='';tooltip.hide();"})
            .html(function(d,i) {
                    if (i%13==0) {
                        if (numberOfSales) {
                            return "<div class='dateLabel' style='top:"+ d[0] +"px;'>" + String(d[1]).substring(4,7) + String(d[1]).substring(10,16) + "</div>";
                        } else {
                            return "<div class='dateLabel' style='top:"+ Math.round(d[2]/10000) +"px;'>" + String(d[1]).substring(4,7) + String(d[1]).substring(10,16) + "</div>";                            
                        }
                    }
                })
            .transition().duration(1000)
                .style("height",function(d) {
                    if (numberOfSales) {
                        return d[0] + "px";
                    } else {
                        return Math.round(d[2]/10000) + "px";
                    }
                })
                .style("top",function(d) {
                    if (numberOfSales) {
                        return "-" + d[0] + "px"
                    } else {
                        return "-" + Math.round(d[2]/10000) + "px";
                    }
                });

    // then build/update the zipcode if it
        d3.select("#timeline").selectAll("div.zipdiv")
            .data(histZip.slice(1))
            .enter().append("div")
                .style("top","0px")
                .attr("class","zipdiv");
        d3.select("#timeline").selectAll("div.zipdiv")
            .style("left",function(d,i) {return String(i*7)+"px"})
            .style("width","5px")
            .style("z-index",function(d) {return d[0]>1 ? "102" : "-1"})
            .attr("onmousemove",function(d) {return "tooltip.show('Week of: " + String(d[1]).substring(4,16) +"<br/>" + d[0]+ " listings sold in 0"+zipcode+"');"})
            .attr("onmouseout","tooltip.hide();")
            .transition().duration(1000)
                .style("height",function(d) {return d[0] + "px"})
                .style("top",function(d) {return "-" + String(parseInt(d[0])) + "px"});
        allZips = d3.select("#timeline").selectAll("div.zipdiv");
            
}

/** returns all the listing details in string form */
function listingToDetailsString(listingIn) {
    return "Price: $" + withCommas(listingIn.price) + "<br/>" + "SqFt: " + withCommas(listingIn.sqft) + "<br/>" +  "Beds: " + listingIn.beds + "<br/>" + "Baths: " + listingIn.baths + "<br/>" + "Zipcode: 0" + listingIn.zip + "<br/>" + "Zestimate: $" + withCommas(listingIn.zestimate);
}


/** anonymous function to create tooltip - code from: sixrevisions.com */
var tooltip=function(){
 var id = 'tt';
 var top = 3;
 var left = 3;
 var maxw = 300;
 var speed = 10;
 var timer = 20;
 var endalpha = 95;
 var alpha = 0;
 var tt,t,c,b,h;
 var ie = document.all ? true : false;
 return{
  show:function(v,w){
   if(tt == null){
    tt = document.createElement('div');
    tt.setAttribute('id',id);
    t = document.createElement('div');
    t.setAttribute('id',id + 'top');
    c = document.createElement('div');
    c.setAttribute('id',id + 'cont');
    b = document.createElement('div');
    b.setAttribute('id',id + 'bot');
    tt.appendChild(t);
    tt.appendChild(c);
    tt.appendChild(b);
    document.body.appendChild(tt);
    tt.style.opacity = 0;
    tt.style.filter = 'alpha(opacity=0)';
    document.onmousemove = this.pos;
   }
   tt.style.display = 'block';
   c.innerHTML = v;
   tt.style.width = w ? w + 'px' : 'auto';
   if(!w && ie){
    t.style.display = 'none';
    b.style.display = 'none';
    tt.style.width = tt.offsetWidth;
    t.style.display = 'block';
    b.style.display = 'block';
   }
  if(tt.offsetWidth > maxw){tt.style.width = maxw + 'px'}
  h = parseInt(tt.offsetHeight) + top;
  clearInterval(tt.timer);
  tt.timer = setInterval(function(){tooltip.fade(1)},timer);
  },
  pos:function(e){
   var u = ie ? event.clientY + document.documentElement.scrollTop : e.pageY;
   var l = ie ? event.clientX + document.documentElement.scrollLeft : e.pageX;
   tt.style.top = (u - h) + 'px';
   tt.style.left = (l + left) + 'px';
  },
  fade:function(d){
   var a = alpha;
   if((a != endalpha && d == 1) || (a != 0 && d == -1)){
    var i = speed;
   if(endalpha - a < speed && d == 1){
    i = endalpha - a;
   }else if(alpha < speed && d == -1){
     i = a;
   }
   alpha = a + (i * d);
   tt.style.opacity = alpha * .01;
   tt.style.filter = 'alpha(opacity=' + alpha + ')';
  }else{
    clearInterval(tt.timer);
     if(d == -1){tt.style.display = 'none'}
  }
 },
 hide:function(){
  clearInterval(tt.timer);
   tt.timer = setInterval(function(){tooltip.fade(-1)},timer);
  }
 };
}();

/** displays our presentation video */
function toggleVideo() {
	$('#mask').toggle();
}

/** displays our project details */
function toggleDescription() {
	$('#description_mask').toggle();
}

/* toggle controls 
function toggleControls() {
    if (document.getElementById('toggleControls').innerHTML=="&lt;") {
        d3.select("#controls")
            .transition().duration(500)
                .style("left","600px");
        document.getElementById('toggleControls').innerHTML="&gt;";
    }
    else {
        d3.select("#controls")
            .transition().duration(500)
                .style("left","915px");
        document.getElementById('toggleControls').innerHTML="&lt;";
    }
}*/


/** initializes square foot slider. range is chosen arbitrarily */
$(function() {
	$( "#slider-range-sqft" ).slider({
	  range: true,
	  min: 0,
	  max: 4000,
	  values: [ 0, 3000 ],
	  slide: function( event, ui ) {
		$( "#amountSqft" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] + " sq ft" );
		filter(1);
	  }
	}).bind({
        slidestart : function(event,ui) {},
        slidechange : function(event,ui) {$( "#amountSqft" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ]);filter(0)},
        slidestop : function(event,ui) {},
    });
	$( "#amountSqft" ).val( $( "#slider-range-sqft" ).slider( "values", 0 ) +
	  " - " + $( "#slider-range-sqft" ).slider( "values", 1 ) + " sq ft");
});

/** initialize price range slider. range is chosen arbitrarily */
$(function() {
	$( "#slider-range-price" ).slider({
	  range: true,
	  min: 0,
	  max: 6000000,
	  values: [ 0, 4000000 ],
	  slide: function( event, ui ) {
		$( "#amountPrice" ).val( "$" + ui.values[ 0 ] + " - " + " $" + ui.values[ 1 ]);
		filter(1);
	  }
	}).bind({
        slidestart : function(event,ui) {},
        slidechange : function(event,ui) {$( "#amountPrice" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ]);filter(0)},
        slidestop : function(event,ui) {},
    });
	$( "#amountPrice" ).val( "$" +  $("#slider-range-price" ).slider( "values", 0 ) +
	  " - " +" $"+ $( "#slider-range-price" ).slider( "values", 1 ));
});

/** initialize year range slider. range is chosen arbitrarily  */
$(function() {
	$( "#slider-range-year" ).slider({
	  range: true,
	  min: 1800,
	  max: 2014,
	  values: [ 1800, 2014 ],
	  slide: function( event, ui ) {
		$( "#amountYear" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ]);
		filter(1);
	  }
	});
	$( "#amountYear" ).val(  $("#slider-range-year" ).slider( "values", 0 ) +
	  " - " + $( "#slider-range-year" ).slider( "values", 1 ));
});