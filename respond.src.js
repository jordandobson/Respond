/*
 * respond.js - A small and fast polyfill for min/max-width CSS3 Media Queries
 * Copyright 2011, Scott Jehl, scottjehl.com
 * Dual licensed under the MIT or GPL Version 2 licenses. 
 * Usage: Check out the readme file or github.com/scottjehl/respond
*/
(function( win, mqSupported ){
	//if media queries are supported, exit here
	if( mqSupported ){ return; }
	var doc 			= win.document,
		docElem 		= doc.documentElement,
		mediastyles	 	= [],
		resizeThrottle	= 50,
		head 			= doc.getElementsByTagName( "head" )[0] || docElem,
		links			= head.getElementsByTagName( "link" ),
		//loop stylesheets, send text content to translateQueries
		ripCSS			= function(){
			var sheets 	= doc.styleSheets,
				sl 		= sheets.length;

			for( var i = 0; i < sl; i++ ){
				var href = sheets[ i ].href;
				ajax( href, function( styles ){
					translateQueries( styles, href );
				} );
			}		
		},
		//find media blocks in css text, convert to style blocks
		translateQueries	= function( styles, href ){
			var qs		= styles.match(/@media (only )?[a-z]+\sand(.*)\{([\S\s]+?)(?=\}\/\*\/mediaquery\*\/)/gmi),
				ql		= qs && qs.length || 0,
				href	= href.substring( 0, href.lastIndexOf( "/" )) + "/";
				
			for( var i = 0; i < ql; i++ ){
				var query 		= qs[ i ].match(/@media (.*)\{([\S\s]+?)$/) && RegExp.$1,
					rules 		= RegExp.$2,
					type 		= query.match(/(only )?([a-z]+)\sand/) && RegExp.$2,
					minw 	= query.match(/\(min\-width:\s?(\s?[0-9]+)px\s?\)/) && RegExp.$1,
					maxw 	= query.match(/\(max\-width:\s?(\s?[0-9]+)px\s?\)/) && RegExp.$1;
				
				//only translate queries that have a type + a min or a max width	
				if( type && minw || maxw ){
					var	ss 			= doc.createElement( "style" ),
						placehold 	= doc.createTextNode( "" ),
						minw		= parseFloat( minw ),
						maxw		= parseFloat( maxw ),	
						//replace relative URLs with stylesheet's base path
						//hat tip: css3mediaqueries lib for regexp gotcha
						rules		= rules.replace( /(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g, "$1" + href + "$2$3" );

					//must set type for IE
					ss.type			= "text/css";
					ss.media 		= type;
			        if ( ss.styleSheet ){ 
			          ss.styleSheet.cssText = rules;
			        } 
			        else {
			          ss.appendChild( doc.createTextNode( rules ) );
			        } 
	
			        //append in order to maintain cascade
		        	var lastSS = mediastyles.length && mediastyles[ mediastyles.length-1 ].ss || links[ links.length-1 ];
		        	if( head.lastchild == lastSS ) {
						head.appendChild( ss );
					} else {
						head.insertBefore( ss, lastSS.nextSibling );
					}
			        
					mediastyles.push( { 
						"ss"		: ss,
						"minw"		: minw, 
						"maxw"		: maxw,
						"placehold"	: placehold
					} );	
				}
				applyMedia();
			}
		},
		lastCall,
		//enable/disable style blocks based on win width
		applyMedia 	= function( fromResize ){
			//throttle resize calls
			var now = (new Date()).getTime();
			if( fromResize && lastCall && now - lastCall < resizeThrottle ){
				return;
			}
			else {
				lastCall = now;
			}
			var name 		= "clientWidth",
				docElemProp = docElem[ name ],
				currWidth 	= doc.compatMode === "CSS1Compat" && docElemProp || doc.body[ name ] || docElemProp,
				//loop whole array or just one item
				loopStyles 	= fromResize ? mediastyles : [ mediastyles[ mediastyles.length-1 ] ];
										
			for( var i in loopStyles ){
				var thisstyle = loopStyles[ i ];
				if( ( !thisstyle.minw || thisstyle.minw && currWidth >= thisstyle.minw ) && 
					(!thisstyle.maxw || thisstyle.maxw && currWidth <= thisstyle.maxw ) ){
					if( thisstyle.placehold.parentNode === head ){
						head.insertBefore( thisstyle.ss, thisstyle.placehold );
						head.removeChild( thisstyle.placehold );
					}
				}
				else {
					if( thisstyle.ss.parentNode === head ){
						head.insertBefore( thisstyle.placehold, thisstyle.ss );
						head.removeChild( thisstyle.ss );
					}
				}
			}	
		},
		//tweaked Ajax functions from Quirksmode
		ajax = function( url, callback ) {
			var req = xmlHttp();
			if (!req){
				return;
			}	
			req.open( "GET", url, true );
			req.onreadystatechange = function () {
				if ( req.readyState != 4 || req.status != 200 && req.status != 304 ){
					return;
				}
				callback(req.responseText);
			}
			if (req.readyState == 4){
				return;
			}
			req.send();
		},
		//define ajax obj 
		xmlHttp = (function() {
			var xmlhttpmethod = false,
				attempts = [
					function(){ return new ActiveXObject("Microsoft.XMLHTTP") },
					function(){ return new ActiveXObject("Msxml3.XMLHTTP") },
					function(){ return new ActiveXObject("Msxml2.XMLHTTP") },
					function(){ return new XMLHttpRequest() }		
				],
				al = attempts.length;
		
			while( al-- ){
				try {
					xmlhttpmethod = attempts[ al ]();
				}
				catch(e) {
					continue;
				}
				break;
			}
			return function(){
				return xmlhttpmethod;
			};
		})();
	
	//translate CSS
	ripCSS();
	//adjust on resize
	function callMedia(){
		applyMedia( true );
	}
	if( win.addEventListener ){
		win.addEventListener( "resize", callMedia, false );
	}
	else if( win.attachEvent ){
		win.attachEvent( "onresize", callMedia );
	}
})(
	this,
	(function( win ){
		//cond. comm. IE check by James Padolsey
		var ie = (function(undef){
 		    var v = 3,
		        div = document.createElement('div'),
		        all = div.getElementsByTagName('i');
		 
		    while(div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->', all[0]);
		    return v > 4 ? v : undef;
		}());
		
		//for speed, flag browsers with window.matchMedia support and IE 9 as supported
		if( win.matchMedia || ie && ie >= 9 ){ return true; }
		//flag IE 8 and under as false - no test needed
		if( ie && ie <= 8){ return false; }
		//otherwise proceed with test
		var doc 		= win.document,
			docElem 	= doc.documentElement,
		    fb 			= doc.createElement( "body" ),
		    div 		= doc.createElement( "div" ),
		    se 	= doc.createElement( "style" ),
			cssrule = "@media only all { #qtest { position: absolute; } }";
			div.setAttribute( "id", "qtest" );
			
		se.type = "text/css";
		fb.appendChild( div );
		if ( se.styleSheet ){ 
		  se.styleSheet.cssText = cssrule;
		} 
		else {
		  se.appendChild(doc.createTextNode(cssrule));
		} 
		docElem.insertBefore( fb, docElem.firstChild );
		docElem.insertBefore( se, fb );
		support = ( win.getComputedStyle ? win.getComputedStyle( div,null ) : div.currentStyle )["position"] == "absolute";
		docElem.removeChild( fb );
		docElem.removeChild( se );
		return support;
	})( this )
);