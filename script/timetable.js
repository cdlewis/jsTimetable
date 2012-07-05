/* Modal Related Functions */

function setupEditSubject()
{
	// Setup the modal
	$( "#edit_subject" ).modal().modal( 'hide' );

	// Create the necessary event callbacks for the modal
	
	$( "#edit_subject .cancel" ).click( function( event )
	{	
		event.preventDefault();
		$( "#edit_subject" ).modal( 'hide' );
	} );
	
	$( "#edit_subject .save" ).click( function( event )
	{
		event.preventDefault();
		
		var cell = $( "." + $( "#edit_subject .target_class" ).val().replace( " ", "." ) )
	
		var name = $( "#edit_subject .subject_input" ).val();
		var room = $( "#edit_subject .room_input" ).val();
		var time = $( "#edit_subject .time_input" ).val();

		enterSubject( cell, name, time, room );
		
		saveTimetable();
		
		$( "#edit_subject" ).modal( 'hide' );
	} );
	
	$( "#edit_subject .reset" ).click( function( event )
	{
		event.preventDefault();
		$( "#edit_subject input[type=text]" ).val( "" )
	} );
}

function editSubject( class_name, name, room, time )
{
	// Alter the header depending on whether we are adding or editing a subject
	if( name == "" )
		$( "#edit_subject h3" ).html( "Add Subject" );
	else
		$( "#edit_subject h3" ).html( "Edit Subject: " + name );

	// Set form values
	$( "#edit_subject .target_class" ).val( class_name );
	$( "#edit_subject .subject_input" ).val( name );
	$( "#edit_subject .room_input" ).val( room );
	$( "#edit_subject .time_input" ).val( time );
	
	// Show modal
	$( "#edit_subject" ).modal( 'show' );
}

/* Helper Functions */

// Takes an element and returns a co-ordinate object based on the class
function decodeCoords( element )
{
	// If the element is a jQuery object then convert to regular DOM
	if( element instanceof jQuery )
		element = element[ 0 ];
	
	var raw = element.className.replace( "x", "" ).replace( "y", "" ).split( " " );
	return { x: raw[ 0 ], y: raw[ 1 ] };
}

// Return a new colour for each unique name
function colourGenerator( potential_colours )
{
	map = {};
	index = 0;
	
	return function( name )
	{
		if( name == "" )
			return "white";
		else if( map[ name ] == undefined )
		{
			map[ name ] = potential_colours[ index ];
			index++;
			if( ( index + 1 ) > index.length )
				index = 0;
		}
		
		return "#" + map[ name ];
	};
}

/* Timetable Specific Functions */

function mapVerticalCells( start_cell, depth, aFunction )
{
	var table = start_cell.parent().parent();
	var row = start_cell.parent();
	var row_num = table.children().index( row );
	var col_num = row.children().index( start_cell );
	
	if( isNaN( depth ) )
		throw "Depth (" + depth + ") is not a number";
	else
		depth = parseInt( depth );
	
	for( var i = depth; i > 1; i-- )
		aFunction( $( ".x" + ( row_num + i - 1 ) + ".y" + col_num ) );
}

/*
	repeat: can take on a number of values. When positive, it indicates the day on which the subject is to be repeated. If -1 then it indicates that no action should be taken. -2 indicates that the subject is the second in a repeating sequence.
 */
 function enterSubject( cell, name, hours, room, repeat )
{
	// Parse and sanitise variables
	var name = name.replace( /\(|\)|<|>/g, "" );
	var hours = parseInt( hours );
	var room = room.replace( /\(|\)|<|>/g, "" );
	var repeat = parseInt( repeat );
	
	if( isNaN( hours ) || hours < 1 || hours > $( "#timetable tr" ).length )
		hours = 1;
	else if( hours > 1 )
		mapVerticalCells( cell, hours, function ( x ) { x.css( "display", "none" ); } );
	
	cell.html( "<span class='name'>" + name + "</span>" );				
	cell.attr( "rowspan", hours );
	cell.css( "background-color", colours( name ) );
	
	// Add room information if any exists
	if( room != "" )
		cell.append( "<div class='room'>(" + room + ")</div>" );
	
	/* The styling of the room information is dependant on the space available.
	 * In the event that there is only 1 hour allocated then no padding is
	 * necessary; otherwise pad at 10%.
	 */

	if( hours > 1 )
		cell.find( ".room" ).css( "padding-top", "10%" );				

	if( repeat > 1 )
	{
		var coords = decodeCoords( cell );

		// Make sure it's not the same column
		if( coords.y == repeat )
			return;

		enterSubject( $( ".x" + coords.x + ".y" + repeat ), name, hours, room, -2 );					
	}
}

function saveTimetable()
{
	var tokens = $.map( $( "td" ), function( element )
	{
		var name = $( element ).find( ".name" ).html()
	
		if( name == null || name == "" ) 
			return;
		else
			name = name.replace( /:|\.|_|,/g, "" ).replace( " ", "_" );

		var room = $( element ).find( ".room" ).html()
		
		if( room == null )
			room = "";
		else
			room = room = room.replace( /:|\.|_|,|\(|\)/g, "" ).replace( " ", "_" );
			
		var length = $( element ).attr( "rowspan" );
		var coords = decodeCoords( element );

		var base_encoding = coords.x + ":" + coords.y + "," + name + "," + room;
		
		if( length > 1 ) // include the length and the repeat
			base_encoding += "," + length;

		return base_encoding;
	} );
	
	// Look for similar tokens and compress them
	for( var i = 0; i < tokens.length; i++ )
	{
		for( var j = 0; j < tokens.length; j++ )
		{
			if( j != i )
			{
				var temp_subject_two = tokens[ j ].substring( 0, 2 ) + tokens[ i ][ 2 ] + tokens[ j ].substring( 3 );

				/* If they are now equal then the only difference was y and based on this information
				 * we can now compress it.
				 */
				if( tokens[ i ] == temp_subject_two )
				{
					var token_length = tokens[ i ].split( "," ).length;
					
					if( token_length == 4 )
						tokens[ i ] += "+" + tokens[ j ][ 2 ];
					else
						tokens[ i ] += ",+" + tokens[ j ][ 2 ];
				
					tokens[ j ] = "";
				}
			}
		}
	}
	console.log( tokens );
	a = tokens;
	var generated_state = encodeURI( tokens.join( "." ).replace( /(\.){2,}|(\.)$/g, '.' ) );
	
	// save the generated state in the URL	
	var url = $( location ).attr( "href" );
	if( url.match( /#.*?$/ ) )
		$( location ).attr( "href", url.replace( /#.*?$/, "#" + generated_state ) );
	else
		$( location ).attr( "href", url + "#" + generated_state );
}

function resetTimetable()
{
	$.map( $( "td" ), function( element )
	{
		// clear all attributes
		$( element ).html( "" ).css( "background-color", "white" ).attr( "rowspan", "1" ).css( "display", "block" );
	} );
	
	saveTimetable();
}

$( "td" ).live( "click", function( event )
{
	var cell = $( event.currentTarget );

	var name = cell.find( ".name" ).html();
	var room = cell.find( ".room" ).html();
	var hours = cell.attr( "rowspan" );
	
	// Ensure we end up with valid options
	if( name == null )
		name = "";
	if( room == null )
		room = "";
	if( hours == null || hours == NaN )
		hours = 1;

	if( hours > 1 )
	{
		mapVerticalCells( cell, cell.attr( "rowspan" ), function ( x ) { x.css( "display", "block" ); } );
		cell.attr( "rowspan", "1" );
	}

	editSubject( cell.attr( "class" ), name, room, hours );
} );

$( ".save_entry" ).live( "click", function( event )
{
	var button = $( event.currentTarget );
	var cell = button.parent().parent();
	var subject_name = cell.children( ":first" ).children( ":nth-child(2)" ).val();
	var subject_hours = cell.children( ":first" ).children( ":nth-child(4)" ).val();
	var subject_room = cell.children( ":first" ).children( ":nth-child(6)" ).val();

	enterSubject( cell, subject_name, subject_hours, subject_room );
	
	saveTimetable();
	
	cell.removeClass( "selected" );
} );

$( document ).ready( function()
{
	// Step 0. Setup colour generations
	colours = colourGenerator( [ "dce6f1", "fde9d9", "ebf1de", "daeef3" ] );

	// Step 1. load the program state from the URL (if it exists)
	var url = $( location ).attr( "href" );
	
	if( url.match( /#.*?$/ ) )
	{
		var raw = decodeURI( url.replace( /^.*?#/, "" ) );
		var cells = raw.split( "." )
		
		for( var i = 0; i < cells.length; i++ )
		{
			var values = cells[ i ].split( "," );
			var cords = values[ 0 ].split( ":" );
			var name = values[ 1 ].replace( "_", " " );
			var room = values[ 2 ].replace( "_", " " );
			
			if( values.length <= 3 )
			{
				var length = 1;
				var repeat = -1;
			}
			else
			{
				var temp = values[ 3 ].split( "+" );							
				if( temp.length < 2 )
					temp[ 1 ] = -1;
				
				var length = temp[ 0 ];
				var repeat = temp[ 1 ]
			}
			
			enterSubject( $( ".x" + cords[ 0 ] + ".y" + cords[ 1 ] ), name, length, room, repeat );
		}
	}

	// Step 2. Hook up buttons
	$( "#delete_button" ).click( function( event )
	{
		event.preventDefault();
		if( confirm( "Are you sure that you want to delete this timetable?" ) )
			resetTimetable();
	} );
	
	$( "#save_button" ).click( function( event )
	{
		event.preventDefault();
		alert( "Add this page as a bookmark or keep a copy of the URL in order to save your timetable." );
	} );
	
	$( "#share_button" ).click( function( event )
	{
		event.preventDefault();
		if( confirm( "You are being redirected to Facebook in order to share this timetable. If you do not wish to do this then press cancel." ) )
			window.location = "https://www.facebook.com/dialog/send?app_id=322630987775976&name=My%20Timetable&link=" + $( location ).attr( "href" ) + "&redirect_uri=" + $( location ).attr( "href" );
	} );
	
	$( "#print_button" ).click( function( event )
	{
		event.preventDefault();
		window.print();
	} );
	
	// Step 3. Hide subject editing modal
	setupEditSubject();
} );