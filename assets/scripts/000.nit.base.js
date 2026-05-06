/*
@requires jquery lib. , bootstrap fw.
*/

var nesti = {
	
	base : function()
	{	
		utf8encode = function(string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
			for (var n = 0; n < string.length; n++) {
				var c = string.charCodeAt(n);
				if (c < 128) {
					utftext += String.fromCharCode(c);
				} else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				} else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}
			return utftext;
		};
		base64_encode = function(data) {
			var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
			var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
				ac = 0,
				enc = '',
				tmp_arr = [];
			if (!data) {
				return data;
			}
			do {
				o1 = data.charCodeAt(i++);
				o2 = data.charCodeAt(i++);
				o3 = data.charCodeAt(i++);
				bits = o1 << 16 | o2 << 8 | o3;
				h1 = bits >> 18 & 0x3f;
				h2 = bits >> 12 & 0x3f;
				h3 = bits >> 6 & 0x3f;
				h4 = bits & 0x3f;
				tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
			} while (i < data.length);
			enc = tmp_arr.join('');
			var r = data.length % 3;
			return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
		};
		
		b64_encode_unicode = function(str)
		{
		   return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
			   return String.fromCharCode('0x' + p1);
		   }));
	    };

		base64_decode = function(data) {
			var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
			var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
				ac = 0,
				dec = '',
				tmp_arr = [];
			if (!data) {
				return data;
			}
			data += '';
			do {
				h1 = b64.indexOf(data.charAt(i++));
				h2 = b64.indexOf(data.charAt(i++));
				h3 = b64.indexOf(data.charAt(i++));
				h4 = b64.indexOf(data.charAt(i++));
				bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
				o1 = bits >> 16 & 0xff;
				o2 = bits >> 8 & 0xff;
				o3 = bits & 0xff;
				if (h3 == 64) {
					tmp_arr[ac++] = String.fromCharCode(o1);
				} else if (h4 == 64) {
					tmp_arr[ac++] = String.fromCharCode(o1, o2);
				} else {
					tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
				}
			} while (i < data.length);
			dec = tmp_arr.join('');
			return dec.replace(/\0+$/, '');
		};

		log = function(str) {
			return console.log(str);
		};

		print_r = function(array) {
			var output = '',
				pad_char = ' ',
				pad_val = 4,
				d = this.window.document,
				getFuncName = function(fn) {
					var name = (/\W*function\s+([\w\$]+)\s*\(/)
						.exec(fn);
					if (!name) {
						return '(Anonymous)';
					}
					return name[1];
				};
			repeat_char = function(len, pad_char) {
				var str = '';
				for (var i = 0; i < len; i++) {
					str += pad_char;
				}
				return str;
			};
			formatArray = function(obj, cur_depth, pad_val, pad_char) {
				if (cur_depth > 0) {
					cur_depth++;
				}
				var base_pad = repeat_char(pad_val * cur_depth, pad_char);
				var thick_pad = repeat_char(pad_val * (cur_depth + 1), pad_char);
				var str = '';

				if (typeof obj === 'object' && obj !== null && obj.constructor && getFuncName(obj.constructor) !==
					'PHPJS_Resource') {
					str += 'Array\n' + base_pad + '(\n';
					for (var key in obj) {
						if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
							str += thick_pad + '[' + key + '] => ' + formatArray(obj[key], cur_depth + 1, pad_val, pad_char);
						} else {
							str += thick_pad + '[' + key + '] => ' + obj[key] + '\n';
						}
					}
					str += base_pad + ')\n';
				} else if (obj === null || obj === undefined) {
					str = '';
				} else { // for our "resource" class
					str = obj.toString();
				}
				return str;
			};
			output = formatArray(array, 0, pad_val, pad_char);
			log(output);
		};

		substr_replace = function(str, replace, start, length) {
			if (start < 0) { // start position in str
				start = start + str.length;
			}
			length = length !== undefined ? length : str.length;
			if (length < 0) {
				length = length + str.length - start;
			}
			return str.slice(0, start) + replace.substr(0, length) + replace.slice(length) + str.slice(start + length);
		};

		replace_arr = function (str,searcharr,replacementarr) {
			for (var i in searcharr)
			{
				str = str.replace(new RegExp(searcharr[i],'g'),replacementarr[i]);
			}
			return str;
		};

		// [haddinden fazla lüzumsuz]
		is = function() {
			return (typeof(arguments[0])!="undefined");
		};
		isempty = function(value) {
			return (trim(value)=='' || value==null);
		};
		
		ltrim = function(str,charlist) {
			charlist = !charlist ? ' \\s\u00A0' : (charlist + '').replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
			var re = new RegExp('^[' + charlist + ']+', 'g');
			return (str + '').replace(re, '');
		};
		rtrim = function(str,charlist) {
			charlist = !charlist ? ' \\s\u00A0' : (charlist + '').replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '\\$1');
			var re = new RegExp('[' + charlist + ']+$', 'g');
			return (str + '').replace(re, '');
		};
		// $.trim ile kıyaslanacak bi ara.
		trim = function(str,charlist)
		{
			return ltrim(rtrim(str,charlist),charlist);
		};
		ucfirst = function (str) {
		  str += '';
		  var f = str.charAt(0)
			.toUpperCase();
		  return f + str.substr(1);
		};
		randomnumber = function(limit) {
			return Math.floor(Math.random()*limit);
		};
		randomstring = function (x) {
			var e = "";
			var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			for (var n = 0; n < x; n++)
				e += t.charAt(Math.floor(Math.random() * t.length));
			return e;
		};
		forcenumber = function(e)
		{
			var nums=new String("0123456789")
			,e = e || window.event
			,key = e.which ? e.which : e.keyCode
			,str = String.fromCharCode(key);
			if ([8, 9, 33, 35, 36, 37, 38, 39, 46].indexOf(key) !== -1)
				return true;
			for(j=0;j<str.length;j++)
				if(nums.indexOf(str.charAt(j)) == -1)
					return false;
			return true;
		};
		
		handleObjects = function()
		{
			if (!$("#mainmodalbox").length) {
			   $("body").append(''+
				'<div class="modal" id="mainmodalbox" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">'+
					'<div class="modal-dialog">'+
						'<div class="modal-content">'+
							'<div class="modal-header">'+
								'<button type="button" class="close" data-dismiss="modal" aria-hidden="true"></button>'+
								'<h4 class="modal-title">tiytil</h4>'+
							'</div>'+
							'<div class="modal-body"><!-- ;-) --></div>'+
							'<div class="modal-footer">'+
								'<button type="button" class="btn btn-primary" data-dismiss="modal">'+nit.str("button_close")+'</button>'+
							'</div>'+
						'</div>'+
					'</div>'+
				'</div>');
			}
			//
			if ($().tooltip) $('.tooltips').tooltip();

		};

		showfile = function(url,width,height,classname,nocache)
		{
			var defaults = {
				width: 350,
				height: 273
			}
			,ext = ext || url.split('.').pop().toLowerCase()
			,html = '';

			if (['jpg','jpeg','gif','png'].indexOf(ext) > -1)
			{
				html ='<img alt="" class="'+((ext!="png")?"bg_defaultloading ":"")+((classname)?classname:"")+'" src="'+url+((!nocache)?"?rnd="+randomnumber(9999):"")+'" width="'+ width +'" height="'+ height +'">';
			}
			else if (ext=="mp4")
			{
				html = '<video class="'+((classname)?classname:"")+'" controls width="'+(width||defaults.width)+'" height="'+(height||defaults.height)+'">'+
					'<source src="'+url+'" type="video/mp4">'+
				  '</video>';
			}
			else if (ext=="mp3")
			{
				html = '<audio class="'+((classname)?classname:"")+'" controls>'+
					'<source src="'+url+'" type="audio/mpeg">'+
				  '</audio>';
			}
			return html;
		};


		// alternative for 404 :
		// $.get().done(function(){}).fail(function(){})
		httpstatus = function(url) {
			var http = new XMLHttpRequest();
			http.open('HEAD', url, false);
			http.send();
			return http.status;
		};

		newimg = function(src) {
			obj=new Image;
			obj.src=src;
			return src;
		};
		
		htmlspecialchars = function(string)
		{
			return string.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;").replace(/\ /g, "&nbsp;").replace(/\"/g, "&quot;").replace(/\'/g, "&#39;");
		};
		
		custom_round = function(num)
		{
			return Math.round(num * 100) / 100;
		}
		
		roundfilesize = function(bytes)
		{
			var filesize = bytes/1024/1024;
			if (filesize>=1) return custom_round(filesize)+" MB";
			filesize *= 1024;
			if (filesize>=1) return Math.round(filesize)+" KB";
			return Math.round(bytes)+" bytes";	
		};
		
		get_cookie = function(key)
		{
			var start = document.cookie.indexOf(key + "=")
			, len = start + key.length + 1
			, end = document.cookie.indexOf(";", len);
			if (start == -1 || (!start && key != document.cookie.substring(0, key.length)))
			{
				return null;
			}
			if (end == -1) end = document.cookie.length;
			return unescape(document.cookie.substring(len, end));
		};
		
		return {
			modal: function(str,vars) {
				var defaults = {
					"oid"         : "mainmodalbox",
					"modalclass"  : "fade",
					"dialogclass" : "", // ex: modal-sm
					"title"       : "Bilgi",
					"modalconf"   : {
						keyboard:true,
						backdrop:true,
						show:true
					}
				};
				var options = this.extendObj(defaults,vars);
				$("#"+options.oid).modal('hide');
				var box = $("#"+options.oid);
				$(".modal-dialog",box).addClass(options.dialogclass);
				if (vars) {
					if (is(vars.header)) $(".modal-header",box).html(vars.header);
					if (is(vars.footer)) {
						$(".modal-footer",box).html(vars.footer);
						if (isempty(vars.footer)) $(".modal-footer",box).hide();
					} 
				}
	//			log(options.title);
				$(".modal-title",box).html(options.title);
				$(".modal-body",box).html(str);
				box.addClass(options.modalclass)
				.modal(options.modalconf);
				if (!box.hasClass("isSetted")) {
					box.on('hidden.bs.modal', function (e) {
						$(this).removeAttr("class").addClass("modal isSetted")
						.find(".modal-dialog").removeAttr("class").addClass("modal-dialog");
					});
				}
				return box;
			},

			fullpageloader: function(title,type) {
				this.hideallmodals();
				var title = (title) ? this.str(title) : this.str('text_wait');
				if (!type) type = 'progress-bar-info';
				var html = "<div class='progress'>"+
					"<div class='progress-bar "+type+" progress-bar-striped active'  role='progressbar' aria-valuenow='100' aria-valuemin='0' aria-valuemax='100' style='width: 100%'></div>"+
				  "</div>";     
				this.modal(html, {
					modalclass  :"fade waitdialog",
					dialogclass :"modal-sm",
					header      : "<h4>"+title+"</h4>",
					footer      : "",
					modalconf: {
						keyboard:false,
						backdrop:"static"
					}
				});
			},
			// ihtiyaç olursa bootbox için bi düzenleme yaapılacak => :not(.bootbox) gibi.
			hideallmodals : function() {
				$('*.modal').modal('hide');
			},

			// wrapper function to block element(indicate loading)
			blockloader: function (element, loaderclass, centerY) {
				var el = $(element);
				if (el.height() <= 400)
				{
					centerY = true;
				}
				el.block({
					message : "<div class='progress'>"+
						"<div class='progress-bar progress-bar-info progress-bar-striped active "+loaderclass+"'  role='progressbar' aria-valuenow='100' aria-valuemin='0' aria-valuemax='100' style='width: 100%'></div>"+
					  "</div>",   
					centerY: centerY != undefined ? centerY : true,
					css: {
						top: '10%',
						border: 'none',
						padding: '2px',
						backgroundColor: 'none',
						'min-width':'225px'
					},
					overlayCSS: {
						backgroundColor: '#000',
						opacity: 0.50,
						cursor: 'wait'
					}
				});
			},

			// wrapper function to un-block element(finish loading)
			hideblockloader: function (el) {
				$(el).unblock({
					onUnblock: function () {
						$(el).css('position', '');
						$(el).css('zoom', '');
					}
				});
			},

			set_object_values : function(json,container,ismulti) {
				$.each(json, function(key, val) {
					val = trim(val);
					key = key+((!ismulti)?"":"[]");
					var obj = $('[name="'+key+'"]', container); 
					var tag = obj.prop("tagName");
					var type = obj.attr("type"); 
					if (tag=="SELECT")
					{
						$("option[value='"+val+"']",obj).eq(0).attr("selected","selected");
					}
					else if (type=="checkbox")
					{
	//					$('[name="'+key+'"]', container).rimuvattr("checked"); (lüzumu halinde)
						if (val!='Yes' && val!='No')
							$('[name="'+key+'"][value="'+val+'"]', container).attr("checked","checked");
						else if (val=='Yes') obj.attr("checked","checked");
					}
					else if (type=="radio")
					{
						$('[name="'+key+'"][value="'+val+'"]', container).attr("checked","checked");
					}
					else if (val!="null")
					{
						obj.val(val);
					}
				});
			},
			
			// ini -> global
			str: function(key) {
				if (typeof tf_dyn == 'undefined')
				{
					return key;
				}
				if (!isempty(tf_dyn.localize[key]))
				{
					return tf_dyn.localize[key];
				}
				return key;
			},

			// ( if key starts '_' will not go resursive block :)
			extendObj : function(defs,vars) {
				if (!vars) 
				{
					return defs;
				}
				var newobj = {};
				for (var i in defs) {
					if (!is(vars[i])) newobj[i] = defs[i];
					else {
						if (i.indexOf('_')!=0 && typeof vars[i] == "object") {
							newobj[i] = this.extendObj(defs[i],vars[i]);
						}
						else {
							newobj[i] = vars[i];
						}
					}
				}
				return newobj;
				
			}, // extendObj
			
			init: function()
			{
				if (!this.initialized)
				{
					handleObjects();
					this.app_url = tf_dyn.cnf.app_url;
					this.loading = {};
					this.loading.def = ''; // newimg(this.app_url+"assets/images/nit/core/loading.gif");
					this.loading.spinner = newimg(this.app_url+"assets/images/nit/core/loading1.gif");
					this.initialized = true;
				}
			}
			
		}; //return
		
	} //base
	
};

$.fn.serializeObject = function()
{
   var obj = {};
   var arr = this.serializeArray();
   $.each(arr, function() {
	   if (obj[this.name]) {
		   if (!obj[this.name].push) {
			   obj[this.name] = [obj[this.name]];
		   }
		   obj[this.name].push(this.value || '');
	   } else {
		   obj[this.name] = this.value || '';
	   }
   });
   return obj;
};

var nit = new nesti.base;
nit.init();