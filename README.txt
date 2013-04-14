	How to run the code:
		1) Run a local python web server from the root directory of this project.
		2) Enter “localhost:8888” in Chrome’s address bar.

	Which parts of code are responsible for what:
		index.html
			This root file contains the links to the various files (scripts, CSS) involved in the project, as well as the basic content of the page, including the titles and text, placeholder divs for the graphic views, and control elements.
		main.css
			This CSS file provides the main formatting and layout of the on-page elements created in index.html.  		main.js
			This file contains the main functions related to the loading, filtering, and presentation of the data. The functions should be commented and self-explanatory upon inspection. One of the functions called most often is the “updateChart” function, which is attached to the onlick property of every control (checkboxes and sliders). It binds the appropriate dataset to the scatterplot, toggles the visibility of each circle (i.e. data point) based on the values found in each controls, colors them appropriately if a zip code is selected, and then scales the X or Y axis if necessary.
	
Which parts are libraries and are they hosted in the folder or externally online?
	  In-Folder (non-libraries):
     index.html
	     main.css
	     main.js

	  Online Libraries:
	     D3 (http://d3js.org/d3.v3.min.js)
     JQuery (http://code.jquery.com/jquery-1.9.1.min.js)
	     JQuery UI (http://code.jquery.com/ui/1.10.2/jquery-ui.js)
	     JQuery CSS (http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css)
	     GMaps API (http://maps.googleapis.com/maps/api/js)

	What data files are you using and how are they fed into the code?
		In-Folder:
			boston-for-sale.csv
	     		boston-sold.csv
		How:
			They are both read in by our function “loadData” in main.js, which harnesses D3’s built-in csv processing to create the Json objects we use throughout the rest of the code.