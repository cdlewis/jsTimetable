var edit_entry_html = '\
<div>\
	<label>Subject Name</label><input class="subject_input" type="text" value="{#name}" />\
	<label>Length (hours)</label><input class="time_input" type="text" value="{#hours}" />\
	<label>Room</label><input class="room_input" type="text" value="{#room}" />\
	<button class="save_entry">Save Entry</button>\
</div>';

function decodeCoords( element )
{
	// If the element is a jQuery object then convert to regular DOM
	if( element instanceof jQuery )
		element = element[ 0 ];
	
	var raw = element.className.replace( "x", "" ).replace( "y", "" ).split( " " );
	return { x: raw[ 0 ], y: raw[ 1 ] };
}

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
colours = colourGenerator( [ "dce6f1", "fde9d9", "ebf1de", "daeef3" ] );

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
 
// TODO: properly sanitise input
function enterSubject( cell, name, hours, room, repeat )
{
	var hours = parseInt( hours );
	var repeat = parseInt( repeat );
	
	if( isNaN( hours ) || hours < 1 || hours > $( "#timetable tr" ).length )
		hours = 1;
	else if( hours > 1 )
		mapVerticalCells( cell, hours, function ( x ) { x.css( "display", "none" ); } );
	
	cell.html( "<span class='name'>" + name + "</span>" );				
	cell.attr( "rowspan", hours );
	cell.css( "background-color", colours( name ) );
				 a=cell;	
	
	// Add room information if any exists
	if( room != "" )
		cell.append( "<div class='room'>(" + room.replace( /\(|\)/g, "" ) + ")</div>" );
	
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

/* This string needs to be compressed
	- (for reference) Note reserved characters
	- Replace spaces (they take up 3 chars)
	- Find a way to guess repeat subjects
*/
function saveTimetable()
{
	var tokens = $.map( $( "td" ), function( element )
	{
		var name = $( element ).find( ".name" ).html()
	
		if( name == null ) 
			return;
		else
			name = name.replace( /:\._,/g, "" ).replace( " ", "_" );
	
		var room = $( element ).find( ".room" ).html()
		
		if( room == null )
			room = "";
		else
			room = room.replace( /:\._,/g, "" ).replace( " ", "_" );
		
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

	var generated_state = encodeURI( tokens.join(".").replace( /\.\./g, "." ).replace( /(\.$)/g, "" ) );
	
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

	// need to check event.target to prevent race conditions when saving
	if( cell.hasClass( "selected" ) == false && !$( event.target ).hasClass( "save_entry" ) )
	{
		var name = cell.find( ".name" ).html();
		var room = cell.find( ".room" ).html();
		var hours = cell.attr( "rowspan" );
		
		if( room == null )
			room = "";
		
		if( cell.attr( "rowspan" ) > 1 )
		{
			mapVerticalCells( cell, cell.attr( "rowspan" ), function ( x ) { x.css( "display", "block" ); } );
			cell.attr( "rowspan", "1" );
		}
		else
			hours = 1;


		cell.html( edit_entry_html.replace( "{#name}", name ).replace( "{#hours}", hours ).replace( "{#room}", room ) ); // DIY templating :)
		cell.addClass( "selected" );
		cell[ 0 ].focus();
	}
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
} );