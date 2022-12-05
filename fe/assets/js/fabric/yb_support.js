//home page add interaction code
$(document).ready(function () {

	//CzImage
	var dirty = false;
	var itemID = 0; //this will give each object, image/text a unique item for keeping track of the undo redo.
	var movedItems = [];
	var skipAfterZoom = false;

	fabric.CzImage = fabric.util.createClass(fabric.Image,
		{
			type: 'CzImage',
			zoomedXY: false,
			initialize: function (element, options) {
				options || (options = {});
				this.callSuper('initialize', element, options);
				this.set({
					primarySrc: options.primarySrc, //.replace(/^.*\/\/[^\/]+/, ''),
					//orgSrc: element.src,
					cx: options.cx ? options.cx : 0, //options.left,
					cy: options.cy ? options.cy : 0, //options.top,
					cw: options.cw ? options.cw : element.width, // clip-width
					ch: options.ch ? options.ch : element.height, // clip-height
					itemID: itemID++,
					imageID: options.imageID,
					origWidth: element.width,
					origHeight: element.height,
				});
			},

			zoomBy: function (x, y, z, callback) {
				var orig_cw = this.cw;
				var orig_ch = this.ch;
				var orig_cx = this.cx;
				var orig_cy = this.cy;

				if (x || y)
					this.zoomedXY = true;

				this.cx += x;
				this.cy += y;

				if (z) {
					this.cw -= z;
					this.ch -= z / (this.width / this.height);
				}

				//if cropped
				var crpd = false,
					xOffset = 0,
					yOffset = 0;

				if (this.width < this.origWidth || this.height < this.origHeight) {
					crpd = true;
					xOffset = this.cropX;
					yOffset = this.cropY;
				}

				if (z && !this.zoomedXY) {
					this.cx = (this.origWidth - this.cw) / 2
					this.cy = (this.origHeight - this.ch) / 2
				}
				else if (z && crpd) {
					// keep it at the current center if we can.
					this.cx = this.cx + (z / 2);
					this.cy = this.cy + (z / (this.width / this.height) / 2);
				}

				if (!crpd) {
					if (this.cw > this.width)
						this.cw = this.width;
					if (this.ch > this.height)
						this.ch = this.height;

					if (this.cw < 1)
						this.cw = 1;
					if (this.ch < 1)
						this.ch = 1;
					if (this.cx < 0)
						this.cx = 0;
					if (this.cy < 0)
						this.cy = 0;

					if (this.cx > this.width - this.cw)
						this.cx = this.width - this.cw;
					if (this.cy > this.height - this.ch)
						this.cy = this.height - this.ch;
				}
				else {
					//if either is too big restore previous values so we don't distort the image.
					if (this.cw > this.origWidth || this.ch > this.origHeight) {
						//start with this
						this.cw = orig_cw;
						this.ch = orig_ch;
						this.cx = orig_cx;
						this.cy = orig_cy;

						skipAfterZoom = true;
					}
					else {
						if (this.cw < 1)
							this.cw = 1;
						if (this.ch < 1)
							this.ch = 1;
						if (this.cx > this.origWidth - this.cw)
							this.cx = this.origWidth - this.cw;
						if (this.cy > this.origHeight - this.ch)
							this.cy = this.origHeight - this.ch;
						if (this.cx < 0)
							this.cx = 0;
						if (this.cy < 0)
							this.cy = 0;
					}
				}

				this.cropX = 0
				this.cropY = 0

				this.rerender(false, callback);
			},

			crop: function (callback) {
				const objs = canvas.getActiveObjects()
				const scale = objs[0].scaleX

				//crop window values
				var crop_width = $("#crop_div").width() / scale;
				var crop_height = $("#crop_div").height() / scale;
				var crop_pos = $("#crop_div").position();
				var crop_x = crop_pos.left / scale;
				var crop_y = crop_pos.top / scale;

				//get values of crop relative to the image if zoomed or not.

				this.cx += this.cw * (crop_x / this.width);
				this.cy += this.ch * (crop_y / this.height);
				this.cw = this.cw * (crop_width / this.width);
				this.ch = this.ch * (crop_height / this.height);

				this.width = this.cw;
				this.height = this.ch;
				this.scaleX = this.scaleY = scale;
				this.cropX = this.cx;
				this.cropY = this.cy;

				// this.rerender(false, callback);
				this.zoomBy(0, 0, 0, callback)
			},

			cropDrag: function (plc_obj, callback) {
				//get crop values first.
				var w = plc_obj.getScaledWidth() / globalScale; //divide by GL because we need to counteract any canvas zooming. same above.
				var h = plc_obj.getScaledHeight() / globalScale;
				var top = h;
				var left = w;	/////?????

				var bound = this.getBoundingRect();

				var width = bound.width;
				var height = bound.height;
				var _left = bound.left;
				var _top = bound.top;

				if (plc_obj.angle != 0) {
					var html = '<div id="crop_parent" style="width:' + width + 'px;height:' + height + 'px;top:' + _top + 'px;left:' + _left + 'px; position:absolute;background:transparent;pointer-events:none;">'; //to contain the drag
					html += '	<div id="crop_div" style="width:' + w * .5 + 'px;height:' + h * .5 + 'px;top:' + (top / 2) + 'px;left:' + (left / 2) + 'px;pointer-events:auto;"></div></div>';
				}
				else {
					var ntop = this.height / 2 - h / 2,
						nleft = this.width / 2 - w / 2;

					var html = '<div id="crop_parent" style="width:' + this.width + 'px;height:' + this.height + 'px;top:' + this.top + 'px;left:' + this.left + 'px; position:absolute;background:transparent;pointer-events:none;">'; //to contain the drag
					html += '	<div id="crop_div" style="width:' + w + 'px;height:' + h + 'px;top:' + ntop + 'px;left:' + nleft + 'px;pointer-events:auto;"></div></div>';
				}

				$('#canvas_div').append(html);

				if (plc_obj.angle != 0)
					$("#crop_div").rotate(plc_obj.angle, { x: 'left', y: 'top' });

				//crop window values
				var crop_width = w;
				var crop_height = h;
				var crop_pos = $("#crop_div").position();
				var crop_x = crop_pos.left;
				var crop_y = crop_pos.top;

				$("#crop_parent").remove();

				//if the placeholder is larger then the image.
				if (w >= this.width || h >= this.height) {
					//start with assuming all are over.
					this.cx = this.cy = 0;
					this.cw = w;
					this.ch = h;
					this.width = this.cw;
					this.height = this.ch;
					this.scaleX = this.scaleY = globalScale;
					this.cropX = this.cx;
					this.cropY = this.cy;

					if (w >= this.width) {
						this.cx += this.cw * (crop_x / this.width);
						this.cw = this.cw * (crop_width / this.width);
						this.width = this.cw;
						this.cropX = this.cx;
					}

					if (h >= this.height) {
						this.cy += this.ch * (crop_y / this.height);
						this.ch = this.ch * (crop_height / this.height);
						this.height = this.ch;
						this.cropY = this.cy;
					}
					/*this.cx = this.cy = 0;
					this.cw = w;
					this.ch = h;
					this.width = this.cw;
					this.height = this.ch;
					this.scaleX = this.scaleY = globalScale;
					this.cropX = this.cx;
					this.cropY = this.cy;		*/

					if (w >= h)
						var z = Math.round(this.cw - this.origWidth + 6);
					else
						var z = Math.round((this.height - this.origHeight) * (this.width / this.height) + 6);

					//var z = 1; //don't zoom because this image is smaller than the bounding box.

				}
				else {
					//get values of crop relative to the image if zoomed or not.
					this.cx += this.cw * (crop_x / this.width);
					this.cy += this.ch * (crop_y / this.height);
					this.cw = this.cw * (crop_width / this.width);
					this.ch = this.ch * (crop_height / this.height);

					this.width = this.cw;
					this.height = this.ch;
					this.scaleX = this.scaleY = globalScale;
					this.cropX = this.cx;
					this.cropY = this.cy;

					if (w >= h)
						var z = Math.round(this.cw - this.origWidth + 6);
					else
						var z = Math.round((this.height - this.origHeight) * (this.width / this.height) + 6);
				}

				this.zoomBy(0, 0, z, callback);
			},

			rerender: function (round_border, callback) {
				var img1 = new Image(), obj = this;
				img1.crossOrigin = '';

				img1.round_border = round_border;

				img1.objWidth = obj.getScaledWidth();
				img1.objHeight = obj.getScaledHeight();

				img1.onload = function () {
					var _canvas = fabric.util.createCanvasElement(), img2 = new Image();
					_canvas.width = obj.width;
					_canvas.height = obj.height;

					var ctx = _canvas.getContext('2d');
					ctx.imageSmoothingEnabled = true;

					const oWidth = Math.floor(obj.width)
					const oHeight = Math.floor(obj.height)

					ctx.drawImage(this, obj.cx, obj.cy, obj.cw, obj.ch, 0, 0, oWidth, oHeight);
					//if need to make the round border
					if (this.round_border && obj.frame_round_border) {
						//scalex = obj.getScaleX();
						//scaley = obj.getScaleY();

						var d = obj.frame_round_border;
						ctx.setLineDash(d.strokeDashArray);
						// ctx.fillStyle = 'transparent';
						ctx.lineWidth = d.strokeWidth + 3;
						ctx.strokeStyle = d.stroke;

						if (this.round_border === 'round') {
							//scale this radius to max of object width.
							if (oWidth > oHeight)
								var radius = ((d.radius / 100) * (oHeight / 2));
							else
								var radius = ((d.radius / 100) * (oWidth / 2));

							//this alows us to not let oval go outside bounds.
							var obj_ratiox = ((oWidth / 2) - radius) / (oWidth / 2);
							var obj_ratioy = ((oHeight / 2) - radius) / (oHeight / 2);

							var x = (((d.offsetx) / 100) * ((oWidth / 2) * obj_ratiox)) + (oWidth / 2); ///scalex;
							var y = (((d.offsety) / 100) * ((oHeight / 2) * obj_ratioy)) + (oHeight / 2); ///scaley;
							ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
							ctx.stroke();
						}
						else if (this.round_border === 'oval') {
							var rx = (d.rx / 100) * oWidth; //
							var ry = (d.ry / 100) * oHeight; //

							//this allows us to not let oval go outside bounds.
							var obj_ratiox = ((oWidth / 2) - rx / 2) / (oWidth / 2);
							var obj_ratioy = ((oHeight / 2) - ry / 2) / (oHeight / 2);

							var x = (((d.offsetx) / 100) * ((oWidth / 2) * obj_ratiox)) + (oWidth / 2); /// need to add offset to bring to center for this canvas
							var y = (((d.offsety) / 100) * ((oHeight / 2) * obj_ratioy)) + (oHeight / 2); ///

							ctx.ellipse(x, y, rx / 2, ry / 2, 0, 0, 2 * Math.PI);
							ctx.stroke();
						}
						else { // this.round_border == "Square
							fabric.Object.drawRoundRect(ctx, obj.my.x, obj.my.y, oWidth, oHeight, obj.my.corner_radius, true);
							ctx.stroke();
						}
					}

					img2.onload = function () {
						obj.setElement(this, null, { width: obj.width, height: obj.height });	//pass in data otherwise it cuts off decimals.				
						//obj.applyFilters(zc.canvas.renderAll.bind(zc.canvas));
						//zc.canvas.renderAll.bind(zc.canvas);
						canvas.renderAll();
						obj.set({
							left: obj.left,
							top: obj.top,
							angle: obj.angle
						});
						obj.setCoords();
						if (callback) { callback(obj); }
					};
					img2.src = _canvas.toDataURL('image/png');
				};
				img1.src = this.primarySrc;

			},

			frame_round_border: null,

			toObject: function () {
				return fabric.util.object.extend(this.callSuper('toObject'), {
					primarySrc: this.primarySrc,
					//orgSrc: this.orgSrc,
					src: this.primarySrc,
					cx: this.cx,
					cy: this.cy,
					cw: this.cw,
					ch: this.ch,
					imageID: this.imageID,
					cropX: this.cropX,
					cropY: this.cropY,
					graphic: this.graphic,
					selectable: this.selectable,
					evented: this.evented,
					group_photo: this.group_photo,
					panel: this.panel
				});
			}
		});

	fabric.CzImage.async = true;

	fabric.CzImage.fromObject = function (object, callback) {
		fabric.util.loadImage(object.src.replace(/^.*\/\/[^\/]+/, ''), function (img) {
			fabric.Image.prototype._initFilters.call(object, object.filters, function (filters) {
				object.filters = filters || [];
				fabric.Image.prototype._initFilters.call(object, object.resizeFilters, function (resizeFilters) {
					object.resizeFilters = resizeFilters || [];
					var instance = new fabric.CzImage(img, object);
					callback && callback(instance);
				});
			});
		}, null, object.crossOrigin);
	};

	var zc = {
		canvas: null,

		zoomBy: function (x, y, z) {
			zc.canvas = canvas;
			var activeObject = zc.canvas.getActiveObject();
			if (activeObject) {
				activeObject.zoomBy(x, y, z, null); //function(){zc.canvas.renderAll()}
			}
		},

		crop_by_placeholder: function (obj, plc_obj) {
			if (!obj) {
				return true;
			}

			console.log('crop_by_placeholder')

			// obj.clipTo = function (ctx) {
			// 	fabric.Object.drawRoundRect(ctx, plc_obj.left - this.left - this.width / 2, plc_obj.top - this.top - this.height / 2, plc_obj.width, plc_obj.height, plc_obj.my.corner_radius, true);
			// }
			canvas.renderAll();
		},

		crop: function (obj, plc_obj) {
			if (!obj)
				var obj = zc.canvas.getActiveObject();

			if (!obj)
				return true;

			if (!plc_obj) {
				obj.crop(
					function () {
						//$('.exit_crop_mode').trigger('click');
						adjust_menu(obj);
						$("#bot_image_menu").hide();
						obj.applyFilters();
						canvas.requestRenderAll();
					}
				);
			}
			else {
				obj.cropDrag(
					plc_obj,
					function () {

						if (obj.replaced) {
							setTimeout(function () {
								//applyImageBorders();

								if (('clipPath' in obj) && obj.clipPath && ('my' in obj) && obj.my.hasBorder == 'ON' && ('frame_round_border' in obj) && obj.frame_round_border && ('hasBorder' in obj.my)) {

									zc.frame_round_border(obj.frame_round_border, obj);
								}
								else if (('cropX' in obj || 'cropY' in obj) || (obj.cx != 0 || obj.cy != 0 || obj.cw != obj.width || obj.ch != obj.height)) {

									zc.frame_round_border(null, obj);
								}
							}, 200);
						}
						else {
							//adjust_menu(obj);
							obj.set("opacity", 1);
							obj.applyFilters();
							canvas.requestRenderAll();
							canvas.setActiveObject(obj);
							obj.saveState();
						}

					}
				);

			}
		},

		objManip: function (prop, value) {
			var obj = zc.canvas.getActiveObject();
			if (!obj) { return true; }

			switch (prop) {
				case 'zoomBy-x':
					obj.zoomBy(value, 0, 0, null); //function(){zc.canvas.renderAll()}
					break;
				case 'zoomBy-y':
					obj.zoomBy(0, value, 0, null); //function(){zc.canvas.renderAll()}
					break;
				case 'zoomBy-z':
					obj.zoomBy(0, 0, value, null); //function(){zc.canvas.renderAll()}
					break;
				default:
					obj.set(prop, obj.get(prop) + value);
					break;
			}

			if ('left' === prop || 'top' === prop) { obj.setCoords(); }
			zc.canvas.renderAll();
			return false;
		},

		frame_round_border: function (d, obj) {
			zc.canvas = canvas;
			if (obj && d) {
				obj.set('dirty', true)

				obj.frame_round_border = d;
				obj.rerender(d.style, function () {
					if (obj.replaced) {
						obj.applyFilters();
						canvas.requestRenderAll();
						canvas.setActiveObject(obj);
						obj.saveState();
					}
					canvas.renderAll();
				});
			}
			else {
				obj.rerender(false, function () {
					if (obj.replaced) {
						obj.applyFilters();
						canvas.requestRenderAll();
						canvas.setActiveObject(obj);
						obj.saveState();
					}

					canvas.renderAll();
				});
				obj.frame_round_border = null;
			}
		},

		init: function (src, opts, plc_obj) {
			// Init canvas:
			zc.canvas = canvas;

			var img = new Image();

			img.onload = function () {
				var fImg = new fabric.CzImage(this, {
					originX: 'left',
					originY: 'top',
					left: opts.x,
					top: opts.y,
					scaleX: opts.scalex * opts.scale,
					scaleY: opts.scaley * opts.scale,
					primarySrc: img.src,
					imageID: opts.imageID,
					graphic: opts.graphic,
					evented: opts.evented,
					selectable: opts.evented,
					group_photo: opts.group_photo,
					opacity: opts.hasOwnProperty("opacity") ? opts.opacity == 0 ? 0 : 1 : 1,
					filters: [new fabric.Image.filters.Brightness({ brightness: 0.01 })]
				});

				if (opts.width) {
					fImg.width = opts.width;
				}
				if (opts.height) {
					fImg.height = opts.height;
				}
				fImg.hasRotatingPoint = false;
				fImg.cornerSize = 20;
				fImg.padding = 7;
				fImg.borderDashArray = [10, 5];

				if (opts.replaced)
					fImg.set('replaced', true);

				fImg.stateProperties.push(
					'borderDashArray',
					'filters',
					'frame_round_border',
					'my',
					'cw',
					'ch',
					'imageID',
					'cropY',
					'cropX',
					'graphic',
					'selectable',
					'evented',
					'group_photo',
					'panel'
				);

				zc.canvas.add(fImg)
				if (fImg.graphic == "border") {
					fImg.sendToBack();
					$("#border_loading_gif").remove();
					fImg.saveState();
				}
				else if (plc_obj) //crop to fit now if needed.
				{
					if (fImg.replaced) {
						addPlaceHolderOptions(plc_obj, fImg);
					}
					zc.crop(fImg, plc_obj);

					// zc.crop_by_placeholder(fImg, plc_obj);
					// fImg.set('opacity', 1);
					fImg.set('left', plc_obj.left);
					fImg.set('top', plc_obj.top);
					// fImg.set('scaleX', fImg.scaleX*2);
					// fImg.set('scaleY', fImg.scaleY*2);
					// if(fImg.my.corner_radius) {
					// 	fImg.my.corner_radius *= 2;
					// }
					canvas.renderAll();

					// console.log('before apply image border ----------', fImg);
					// applyImageBorders();
					// canvas.renderAll();
					// var ctx = zc.canvas.getContext('2d');
					// ctx.fillStyle = "transparent";
					// ctx.lineWidth = 10;
					// ctx.strokeStyle = "#555";
					// // fabric.Object.drawRoundRect(ctx, plc_obj.left, plc_obj.top, plc_obj.width, plc_obj.height, 30, true);
					// fabric.Object.drawRoundRect(ctx, 100, 200, 100, 100, 20, true);
					// ctx.stroke();
					// zc.canvas.renderAll();
					// skipAfterZoom = true;

					// canvas.renderAll();
					// skipAfterZoom = true;
					// zc.canvas.setActiveObject(fImg);
				}
				else //if border don't activate it.
				{
					zc.canvas.discardActiveObject();
					zc.canvas.setActiveObject(fImg);
					fImg.saveState();
				}
				updateGreenMark("add", fImg);
			};
			img.src = src;
			//this.initKeyboard();
		},
	};

	//apply the placeholder options to the image dragged on.
	var addPlaceHolderOptions = function (plc_obj, obj) {
		obj.set("opacity", plc_obj.opacity);
		obj.set("my", plc_obj.my);

		//scale things a bit.
		//if (plc_obj.my.radius != "0")
		//obj.my.radius = Math.round(plc_obj.my.radius*plc_obj.scaleX);
		// obj.width = plc_obj.width * plc_obj.scaleX / globalScale;
		// obj.height = plc_obj.height * plc_obj.scaleY / globalScale
		obj.my.radius = plc_obj.my.radius * plc_obj.scaleX / globalScale;
		if (plc_obj.my.offsetx != "0") {
			obj.my.offsetx = plc_obj.my.offsetx * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.offsety != "0") {
			obj.my.offsety = plc_obj.my.offsety * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.corner_radius != "0") {
			obj.my.corner_radius = plc_obj.my.corner_radius / 2 / globalScale;
		}
		//if (plc_obj.my.oval_width != "0")
		//obj.my.oval_width = Math.round(plc_obj.my.oval_width*plc_obj.scaleX);
		//if (plc_obj.my.oval_height != "0")
		//obj.my.oval_height = Math.round(plc_obj.my.oval_height*plc_obj.scaleX);
		//if (plc_obj.my.oval_height != "0")
		//obj.my.oval_height = Math.round(plc_obj.my.oval_height*plc_obj.scaleX);	
		if (plc_obj.my.x != 0) {
			obj.my.x = plc_obj.my.x * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.y != 0) {
			obj.my.y = plc_obj.my.y * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.circle_radius > 0) {
			obj.my.circle_radius = plc_obj.my.circle_radius * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.strokeWidth > 0) {
			obj.my.strokeWidth = plc_obj.my.strokeWidth * plc_obj.scaleX / globalScale;
			obj.my.strokeWidth = obj.my.strokeWidth >= 1 ? obj.my.strokeWidth : 1;
		}
		if (plc_obj.my.oval_rx != 0) {
			obj.my.oval_rx = plc_obj.my.oval_rx * plc_obj.scaleX / globalScale;
		}
		if (plc_obj.my.oval_ry != 0) {
			obj.my.oval_ry = plc_obj.my.oval_ry * plc_obj.scaleX / globalScale;
		}

		obj.set("frame_round_border", plc_obj.frame_round_border);
		//scale things a bit.
		if (plc_obj.frame_round_border) {
			//if (plc_obj.frame_round_border.radius > 0)
			obj.frame_round_border.radius = plc_obj.frame_round_border.radius / globalScale;
			//if (plc_obj.frame_round_border.rx > 0)
			//obj.frame_round_border.rx = Math.round(plc_obj.frame_round_border.rx*plc_obj.scaleX);
			//if (plc_obj.frame_round_border.ry > 0)
			//obj.frame_round_border.ry = Math.round(plc_obj.frame_round_border.ry*plc_obj.scaleX);
			if (plc_obj.frame_round_border.ow != 0) {
				obj.frame_round_border.ow = plc_obj.frame_round_border.ow * plc_obj.scaleX / globalScale;
			}
			if (plc_obj.frame_round_border.oh != 0) {
				obj.frame_round_border.oh = plc_obj.frame_round_border.oh * plc_obj.scaleX / globalScale;
			}
			//if (plc_obj.frame_round_border.offsetx != 0)
			//obj.frame_round_border.offsetx = Math.round(plc_obj.frame_round_border.offsetx*plc_obj.scaleX);
			//if (plc_obj.frame_round_border.offsety != 0)
			//obj.frame_round_border.offsety = Math.round(plc_obj.frame_round_border.offsety*plc_obj.scaleX);
			if (plc_obj.frame_round_border.strokeWidth > 0) {
				obj.frame_round_border.strokeWidth = plc_obj.frame_round_border.strokeWidth * plc_obj.scaleX / globalScale;
			}
		}

		// var offset_left = obj.left - plc_obj.left;
		// var offset_top = obj.top - plc_obj.top;

		if (plc_obj.frame_round_border && plc_obj.my && plc_obj.my.frame_style) {
			obj.clipPath = null
			if (plc_obj.my.frame_style == "round") {
				obj.clipPath = new fabric.Circle({
					top: obj.my.y,
					left: obj.my.x,
					radius: obj.my.circle_radius,
					startAngle: 0,
					angle: Math.PI * 2,
					originX: "center",
					originY: "center"
				})
			} else if (plc_obj.my.frame_style == "oval") {
				obj.clipPath = new fabric.Ellipse({
					left: obj.my.x,
					top: obj.my.y,
					rx: obj.my.oval_rx / 2,
					ry: obj.my.oval_ry / 2,
					angle: 0,
					originX: 'center',
					originY: 'center'
				})
			} else if (plc_obj.my.frame_style == "square") {
				obj.clipPath = new fabric.Rect({
					left: -plc_obj.my.oval_rx / 2,
					top: -plc_obj.my.oval_ry / 2,
					width: plc_obj.my.oval_rx,
					height: plc_obj.my.oval_ry,
					rx: obj.my.corner_radius,
					ry: obj.my.corner_radius,
				})
			}
		}

		obj.set("angle", plc_obj.angle);
		obj.set("stroke", plc_obj.stroke);
		obj.set("strokeWidth", plc_obj.strokeWidth * plc_obj.scaleX / globalScale);
		obj.set("strokeLineJoin", plc_obj.strokeLineJoin);
		obj.set("strokeDashArray", plc_obj.strokeDashArray);

		if (plc_obj.shadow) {
			obj.set("shadow", plc_obj.shadow);
			if (plc_obj.shadow.blur > 0)
				obj.shadow.blur = Math.round(plc_obj.shadow.blur * plc_obj.scaleX / globalScale);
			if (plc_obj.shadow.offsetX > 0)
				obj.shadow.offsetX = Math.round(plc_obj.shadow.offsetX * plc_obj.scaleX / globalScale);
			if (plc_obj.shadow.offsetY > 0)
				obj.shadow.offsetY = Math.round(plc_obj.shadow.offsetY * plc_obj.scaleX / globalScale);
		}

		obj.set("filters", plc_obj.filters);
	}

	//set canvas width + a bit for tick marks.
	aspectRatio = (canvasWidth * numPages) / canvasHeight;

	var _w = $("#canvas_size").width();
	var _h = Math.round(_w / aspectRatio);

	$("#canvas_div").css("width", _w);
	$("#canvas_div").css("height", _h);

	//scaling is based on 1080x1380 which is 40% of 2700x3450

	//var canvas = new fabric.Canvas('c');	
	var canvas = new fabric.Canvas('c',
		{
			rotationCursor: 'url(' + rotationCursorSRC + '), default',
			uniScaleTransform: false,
			width: canvasWidth * numPages,
			height: canvasHeight,
		});

	fabric.Object.NUM_FRACTION_DIGITS = 10;

	var cur_id;

	//image
	var bot_image_menu_width = 250;
	var top_image_menu_width = 350;
	var top_image_menu_left, bot_image_menu_left, top_image_menu_offset = 30;

	//text
	var bot_text_menu_width = 250;
	var top_text_menu_width = 250;
	var top_text_menu_left, bot_text_menu_left, top_text_menu_offset = 30;

	var icon_width = 20, menu_height = 40, menu_offset = 20;
	var otype;
	var change = false;

	function objectSelected(obj) {
		var id = canvas.getObjects().indexOf(obj);
		var add = false;
		otype = obj.get('type');
		var replaced = obj.get('replaced'); //need this when replacing an image because it keeps the highest index and jacks menu up.

		//reset the crop mode in case.
		if (id != cur_id && cropping) {
			resetCropMode();
			$(".all_menus").remove();
		}

		if (otype == 'CzImage') {

			if ($(".image_menus").length == 0 || cur_id != id || replaced || redo_undo_action) {
				if (cur_id && cur_id != id)
					change = true;
				//obj.set('replaced',false);

				$(".all_menus").remove();
				var h = '';
				h += '<div class="image_menus all_menus panel" id="top_image_menu" style="display:none; width:' + top_image_menu_width + 'px;">';
				h += '	<div id="top_image_menu_div" class="image_menu_divs">';
				h += '		<button class="bring_front btn btn-default col-md-3" title="Bring Forward" type="button"><img src="' + img_path + 'bring_front.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="send_back btn btn-default col-md-3" title="Send Backward" type="button"><img src="' + img_path + 'send_back.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="crop_mode btn btn-default col-md-3" title="Crop Image" type="button"><img src="' + img_path + 'crop_zoom.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="copy_object copy_image btn btn-default col-md-3" title="Copy Image" type="button"><img src="' + img_path + 'copy.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '	</div>';

				h += '	<div id="zoom_div" class="text-right" style="display:none;">';
				h += '		<div class="col-md-6" style="padding-left: 0px; padding-right: 0px;">';
				h += '		<button title="Zoom In" class="btn btn-default crop_btn zoom-in col-md-3 gi-1-5x" type="button"><span class="glyphicon glyphicon-zoom-in"></span></button>';
				h += '		<button title="Zoom Out" class="btn btn-default crop_btn zoom-out col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><span class="glyphicon glyphicon-zoom-out"></span></button>';
				h += '		<button title="Move Left" class="btn btn-default crop_btn arrow-left col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><span class="glyphicon glyphicon-circle-arrow-left"></span></button>';
				h += '		<button title="Move Up" class="btn btn-default crop_btn arrow-up col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><span class="glyphicon glyphicon-circle-arrow-up"></span></button>';
				h += '		</div>';
				h += '		<div class="col-md-6" style="padding-left: 0px; padding-right: 0px;">';
				h += '		<button title="Move Down" class="btn btn-default crop_btn arrow-down col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><span class="glyphicon glyphicon-circle-arrow-down"></span></button>';
				h += '		<button title="Move Right" class="btn btn-default crop_btn arrow-right col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><span class="glyphicon glyphicon-circle-arrow-right"></span></button>';
				h += '		<button title="Set Crop" disabled class="btn btn-default set_crop col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button"><i class="fa fa-crop"></i></button>';
				h += '		<button title="Crop" disabled class="btn btn-default crop_now col-md-3 gi-1-5x 1inline-block-left-space-fix" type="button" style="font-size:15px;">OK</button>';
				h += '		</div>';
				h += '		<button title="Exit Crop Mode" style="width:100%" class="btn btn-default exit_crop_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Crop Mode</span></button>';
				h += '	</div>';
				h += '</div>';

				h += '<div class="image_menus panel all_menus image_menu_divs" id="bot_image_menu" style="display:none; width:' + bot_image_menu_width + 'px;" >';
				h += '	<div id="bottom_image_menu_div" class="image_menu_divs" >';
				h += '		<button class="brightcon_image_btn btn btn-default col-md-2" title="Adjust Brightness/Contrast" type="button"><img src="' + img_path + 'brightness_contrast.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="opacity_image_btn btn btn-default col-md-2" title="Adjust Opacity" type="button"><img src="' + img_path + 'opacity.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="grayscale_image_btn btn btn-default col-md-2" title="Grayscale" type="button"><img src="' + img_path + 'grayscale.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="border_image_btn btn btn-default col-md-2" title="Border" type="button"><img src="' + img_path + 'border.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="shadow_image_btn btn btn-default col-md-2" title="Shadow" type="button"><img src="' + img_path + 'shadow.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="delete_btn btn btn-default col-md-2" title="Delete" type="button"><img src="' + img_path + 'trash.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '	</div>';

				//These are the filters below.
				//border filter.		
				h += '	<div id="border_image_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label for="border_image_status" class="col-md-7 control-label small">Border:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small" id="border_image_status" ><option value="OFF">OFF</option><option value="ON">ON</option></select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="border_image_size" class="col-md-7 text-left control-label small">Size:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small" id="border_image_size" >';
				for (var i = 1; i <= 100; i++) {
					h += '							<option value="' + i + '">' + i + '</option>';
				}
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="border_image_colorpicker" class="col-md-8 text-left control-label small">Color:</label>';
				h += '					<div class="col-md-4">';
				h += '						<input id="border_image_colorpicker" class="colorpicker"/>';
				h += '					</div>';
				h += '				</div>';
				// h += '				<div class="form-group">';
				// h += '					<label for="border_image_corners" class="col-md-6 text-left control-label small">Corners:</label>';
				// h += '					<div class="col-md-6">';
				// h += '						<select class="form-control small" id="border_image_corners" >';
				// h += '							<option value="miter">Sharp</option><option value="round">Rounded</option>';
				// h += '						</select>';
				// h += '					</div>';
				// h += '				</div>';

				h += '				<div class="form-group">';
				h += '					<label for="border_image_line_style" class="col-md-6 text-left control-label small">Line Style:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small" id="border_image_line_style" >';
				h += '							<option value="solid">Solid</option><option value="dashed">Dashed</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="border_image_frame_style" class="col-md-6 text-left control-label small">Frame Style:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small" id="border_image_frame_style" >';
				h += '							<option value="square">Square</option><option value="round">Round</option><option value="oval">Oval</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group image_frame image_frame_round" style="display:none;">';
				h += '					<label id="border_image_frame_radius_text" for="border_image_frame_radius" class="col-md-6 control-label small">Radius:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_frame_radius" class="image_frame_option" type="range" max="100" min="10" step="5" value="30">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group image_frame" style="display:none;">';
				h += '					<label id="border_image_frame_radius_offsetx_text" for="border_image_frame_radius_offsetx" class="col-md-6 control-label small">Offset-X:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_frame_radius_offsetx" class="image_frame_option" type="range" max="100" min="-100" step="5" value="0">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group image_frame" style="display:none;">';
				h += '					<label id="border_image_frame_radius_offsety_text" for="border_image_frame_radius_offsety" class="col-md-6 control-label small">Offset-Y:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_frame_radius_offsety" class="image_frame_option" type="range" max="100" min="-100" step="5" value="0">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group image_frame image_frame_oval" style="display:none;">';
				h += '					<label id="border_image_frame_radius_width_text" for="border_image_frame_radius_width" class="col-md-6 control-label small">Width:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_frame_radius_width" class="image_frame_option" type="range" max="100" min="10" step="5" value="100">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group image_frame image_frame_oval" style="display:none;">';
				h += '					<label id="border_image_frame_radius_height_text" for="border_image_frame_radius_height" class="col-md-6 control-label small">Height:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_frame_radius_height" class="image_frame_option" type="range" max="100" min="10" step="5" value="100">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group border_image_radius_frame">';
				h += '					<label for="border_image_radius" class="col-md-6 text-left control-label small">Border Radius:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="border_image_radius" class="form-control" type="number" max="100" min="1" value="0" step="1" value="5">';
				h += '					</div>';
				h += '				</div>';
				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Border Mode" style="width:100%" class="btn btn-default exit_image_border_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Border Mode</span></button>';
				h += '	</div>';

				//shadow filter
				h += '	<div id="shadow_image_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label for="shadow_image_status" class="col-md-7 control-label small">Shadow:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small shadow_image" id="shadow_image_status" ><option value="OFF">OFF</option><option value="ON">ON</option></select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_image_blur_text" for="shadow_image_blur" class="col-md-6 text-left control-label small">Blur:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_image_blur" class="shadow_image" type="range" max="50" min="0" step="2" value="10">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_image_offsetx_text" for="shadow_image_offsetx" class="col-md-6 text-left control-label small">Offset-X:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_image_offsetx" class="shadow_image" type="range" max="50" min="-50" step="2" value="10">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_image_offsety_text" for="shadow_image_offsety" class="col-md-6 text-left control-label small">Offset-Y:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_image_offsety" class="shadow_image" type="range" max="50" min="-50" step="2" value="10">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="shadow_image_colorpicker" class="col-md-8 text-left control-label small">Color:</label>';
				h += '					<div class="col-md-4">';
				h += '						<input class="shadow_image colorpicker" id="shadow_image_colorpicker"/>';
				h += '					</div>';
				h += '				</div>';


				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Shadow Mode" style="width:100%" class="btn btn-default exit_image_shadow_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Shadow Mode</span></button>';
				h += '	</div>';

				//grayscale filter
				h += '	<div id="grayscale_image_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label for="grayscale_image_status" class="col-md-7 control-label small">Grayscale:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small grayscale_image" id="grayscale_image_status" ><option value="OFF">OFF</option><option value="ON">ON</option></select>';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Grayscale Mode" style="width:100%" class="btn btn-default exit_image_grayscale_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Grayscale Mode</span></button>';
				h += '	</div>';

				//opacity filter
				h += '	<div id="opacity_image_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label id="opacity_image_value_text" for="opacity_image_value" class="col-md-7 text-left control-label small">Opacity:</label>';
				h += '					<div class="col-md-5">';
				h += '						<input id="opacity_image_value" type="range" min="0" max="100" step="5" value="100">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Opacity Mode" style="width:100%" id="exit_image_opacity_mode" class="btn btn-default" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Opacity Mode</span></button>';
				h += '	</div>';

				//brightness contrast filter
				h += '	<div id="brightcon_image_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';
				h += '				<div class="form-group">';
				h += '					<label id="brightness_image_value_text" for="brightness_image_value" class="col-md-6 text-left control-label small">Brightness:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="brightness_image_value" type="range" max="100" min="-100" step="5" value="0">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="contrast_image_value_text" for="contrast_image_value" class="col-md-6 text-left control-label small">Contrast:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="contrast_image_value" type="range" min="-100" max="100" step="5" value="0">';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Brightness-Contrast Mode" style="width:100%" class="btn btn-default exit_image_brightcon_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Brightness-Contrast Mode</span></button>';
				h += '	</div>';

				h += '</div>';

				add = true;

				//$('#canvas_div').append(h);		

				//addPicker();

				//adjust_menu(obj);
				//$(".image_menus").show(); 

			}
		}
		else if (otype == 'Textbox') {
			if ($(".text_menus").length == 0 || cur_id != id || redo_undo_action) {

				if (cur_id && cur_id != id)
					change = true;

				$(".all_menus").remove();
				var h = '';
				h += '<div class="text_menus all_menus panel" id="top_text_menu" style="display:none; width:' + top_text_menu_width + 'px;">';
				h += '	<div id="top_text_menu_div" class="text_menu_divs">';
				h += '		<button class="bring_front btn btn-default col-md-4" title="Bring Forward" type="button"><img src="' + img_path + 'bring_front.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="send_back btn btn-default col-md-4" title="Send Backward" type="button"><img src="' + img_path + 'send_back.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="copy_object copy_text btn btn-default col-md-4" title="Copy Text" type="button"><img src="' + img_path + 'copy.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '	</div>';
				h += '</div>';

				h += '<div class="text_menus panel all_menus text_menu_divs" id="bot_text_menu" style="display:none; width:' + bot_text_menu_width + 'px;" >';
				h += '	<div id="bottom_text_menu_div" class="text_menu_divs" >';
				h += '		<button class="opacity_text_btn btn btn-default col-md-3" title="Adjust Opacity" type="button"><img src="' + img_path + 'opacity.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="font_text_btn btn btn-default col-md-3" title="Change Font" type="button"><img src="' + img_path + 'font-icon.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="shadow_text_btn btn btn-default col-md-3" title="Shadow" type="button"><img src="' + img_path + 'shadow.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '		<button class="delete_btn btn btn-default col-md-3" title="Delete" type="button"><img src="' + img_path + 'trash.png" width="' + icon_width + '" height="' + icon_width + '" alt=""/></button>';
				h += '	</div>';

				//These are the filters below.
				//fonts filter.		
				h += '	<div id="font_text_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label for="font_text_fontsize" class="col-md-7 text-left control-label small">Font Size:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small font_option" id="font_text_fontsize" >';
				for (var i = 1; i <= 150; i++) {
					h += '							<option ' + (i == 20 ? 'selected="selected"' : '') + ' value="' + i + '">' + i + '</option>';
				}
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="font_text_fontfamily" class="col-md-3 text-left control-label small">Font Family:</label>';
				h += '					<div class="col-md-9">';
				h += '						<select class="form-control small font_option" id="font_text_fontfamily" >';

				var default_fonts = ['Arial', 'Calibri', 'Courier New', 'Myriad Pro', 'Delicious', 'Verdana', 'Georgia', 'Courier', 'Comic Sans MS', 'Impact', 'Monaco'];
				if (fonts.length > 0) {
					var newFonts = $.merge(default_fonts, fonts);
					newFonts.sort();
				}
				else
					var newFonts = default_fonts;

				$.each(newFonts, function (i, v) {
					var k = v.split(":");
					var f = k[0];

					if (k.length > 1) //italics bold bolditalic
					{
						var st = k[1];

						if (st == "italic")
							h += '							<option style="font-family:' + f + '; font-style:italic" value="' + f + ':italic">' + f + ' (Italic)</option>';
						else if (st == "bold")
							h += '							<option style="font-family:' + f + '; font-weight:bold; font-style:normal" value="' + f + ':bold">' + f + ' (Bold)</option>';
						else if (st == "bolditalic")
							h += '							<option style="font-family:' + f + '; font-weight:bold; font-style:italic" value="' + f + ':bolditalic">' + f + ' (Bold-Italic)</option>';
					}
					else
						h += '							<option style="font-family:' + f + '" value="' + f + '">' + f + '</option>';

					//h += '							<option style="font-family:'+k[0]+';" value="'+v+'">'+k[0]+'</option>';											
				});

				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="font_text_color_colorpicker" class="col-md-8 text-left control-label small">Font Color:</label>';
				h += '					<div class="col-md-4">';
				h += '						<input id="font_text_color_colorpicker" class="colorpicker font_option"/>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="font_text_textalign" class="col-md-6 text-left control-label small">Text Align:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small font_option" id="font_text_textalign" >';
				h += '							<option value="left">Left</option>';
				h += '							<option value="center">Center</option>';
				h += '							<option value="right">Right</option>';
				h += '							<option value="justify">Justify</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group" style="display:none;">';
				h += '					<label for="font_text_fontstyle" class="col-md-6 text-left control-label small">Font Style:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small font_option" id="font_text_fontstyle" >';
				h += '							<option value="normal">Normal</option>';
				h += '							<option value="italic">Italic</option>';
				h += '							<option value="oblique">Oblique</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="font_text_textdecoration" class="col-md-6 text-left control-label small">Font Decoration:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small font_option" id="font_text_textdecoration" >';
				h += '							<option value="normal">Normal</option>';
				h += '							<option value="underline">Underline</option>';
				h += '							<option value="overline">Overline</option>';
				h += '							<option value="line-through">Line-Through</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group" style="display:none;">';
				h += '					<label for="font_text_fontweight" class="col-md-6 text-left control-label small">Font Weight:</label>';
				h += '					<div class="col-md-6">';
				h += '						<select class="form-control small font_option" id="font_text_fontweight" >';
				h += '							<option value="normal">Normal</option>';
				h += '							<option value="bold">Bold</option>';
				h += '							<option value="400">400</option>';
				h += '							<option value="600">600</option>';
				h += '							<option value="800">800</option>';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="font_text_fontlineheight_text" for="font_text_fontlineheight" style="width:55%;" class="col-md-7 control-label small">Line Height:</label>';
				h += '					<div class="col-md-5" style="width:45%;">';
				h += '						<input id="font_text_fontlineheight" class="font_option" type="range" max="3" min="1" step=".1" value="1">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="font_text_fontstrokewidth_text" for="font_text_fontstrokewidth" style="width:55%;" class="col-md-7 text-left control-label small">Stroke Width:</label>';
				h += '					<div class="col-md-5" style="width:45%;">';
				h += '							<input id="font_text_fontstrokewidth" class="font_option" type="range" max="5" min="0" step=".25" value="0">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="font_text_fontstroke_colorpicker_text" class="col-md-8 text-left control-label small">Stroke Color:</label>';
				h += '					<div class="col-md-4">';
				h += '						<input id="font_text_fontstroke_colorpicker" class="colorpicker font_option"/>';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Font Mode" id="exit_font_text_mode" style="width:100%" class="btn btn-default" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Font Mode</span></button>';
				h += '	</div>';

				//shadow filter
				h += '	<div id="shadow_text_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label for="shadow_text_status" class="col-md-7 control-label small">Shadow:</label>';
				h += '					<div class="col-md-5">';
				h += '						<select class="form-control small shadow_text" id="shadow_text_status" ><option value="OFF">OFF</option><option value="ON">ON</option></select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_text_blur_text" for="shadow_text_blur" class="col-md-6 text-left control-label small">Blur:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_text_blur" class="shadow_text" type="range" max="50" min="0" step="2" value="10">';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_text_offsetx_text" for="shadow_text_offsetx" class="col-md-6 text-left control-label small">Offset-X:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_text_offsetx" class="shadow_text" type="range" max="50" min="-50" step="2" value="10">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label id="shadow_text_offsety_text" for="shadow_text_offsety" class="col-md-6 text-left control-label small">Offset-Y:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="shadow_text_offsety" class="shadow_text" type="range" max="50" min="-50" step="2" value="10">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';
				h += '				<div class="form-group">';
				h += '					<label for="shadow_text_colorpicker" class="col-md-8 text-left control-label small">Color:</label>';
				h += '					<div class="col-md-4">';
				h += '						<input class="shadow_text colorpicker" id="shadow_text_colorpicker"/>';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Shadow Mode" style="width:100%" class="btn btn-default exit_text_shadow_mode" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Shadow Mode</span></button>';
				h += '	</div>';

				//opacity filter
				h += '	<div id="opacity_text_div" class="" style="display:none;">';
				h += '		<div class="panel panel-default">';
				h += '			<div class="panel-body form-horizontal">';

				h += '				<div class="form-group">';
				h += '					<label id="opacity_text_value_text" for="opacity_text_value" class="col-md-6 text-left control-label small">Opacity:</label>';
				h += '					<div class="col-md-6">';
				h += '						<input id="opacity_text_value" type="range" min="0" max="100" step="5" value="100">';
				h += '						</select>';
				h += '					</div>';
				h += '				</div>';

				h += '			</div>';
				h += '		</div>';
				h += '		<button title="Exit Opacity Mode" style="width:100%" id="exit_text_opacity_mode" class="btn btn-default" type="button"><span style="font-size: 70%; font-weight:bold;">Exit Opacity Mode</span></button>';
				h += '	</div>';

				h += '</div>';

				add = true;

			}

		}

		if (add) {

			obj.set('replaced', false);

			$('#canvas_div').append(h);

			addPicker();

			setTimeout(function () {
				adjust_menu(obj);
				$(".text_menus").show();
				loadMenuValues(obj);
				redo_undo_action = false;
			}, 50);

		}
		cur_id = id;
	}

	const selectionOccured = obj => {
		obj.selected.length === 1 && objectSelected(obj.selected[0])
	}

	canvas.on({
		'selection:updated': selectionOccured,
		'selection:created': selectionOccured
	});

	loadMenuValues = function (obj) {

		if (otype == 'Textbox') {
			//font
			$("#font_text_fontsize").val(obj.fontSize);
			$("#font_text_color_colorpicker").spectrum("set", obj.fill);
			$("#font_text_textalign").val(obj.textAlign);
			$("#font_text_fontstyle").val(obj.fontStyle);
			$("#font_text_fontweight").val(obj.fontWeight);

			if (obj.fontStyle == "italic" && obj.fontWeight == "bold")
				$("#font_text_fontfamily").val(obj.fontFamily + ":bolditalic");
			else if (obj.fontStyle == "normal" && obj.fontWeight == "bold")
				$("#font_text_fontfamily").val(obj.fontFamily + ":bold");
			else if (obj.fontStyle == "italic" && obj.fontWeight == "normal")
				$("#font_text_fontfamily").val(obj.fontFamily + ":italic");
			else
				$("#font_text_fontfamily").val(obj.fontFamily);

			$("#font_text_textdecoration").val(obj.textDecoration);
			$("#font_text_fontlineheight").val(obj.lineHeight);
			$("#font_text_fontlineheight_text").html("Line Height:&nbsp;&nbsp;" + obj.lineHeight);
			$("#font_text_fontstroke_colorpicker").spectrum("set", obj.stroke);
			$("#font_text_fontstrokewidth").val(obj.strokeWidth);
			$("#font_text_fontstrokewidth_text").html("Stroke Width:&nbsp;&nbsp;" + obj.strokeWidth);

			//shadow
			if (obj.shadow) {
				$("#shadow_text_status").val('ON');
				$("#shadow_text_blur").val(obj.shadow.blur);
				$("#shadow_text_offsetx").val(obj.shadow.offsetX);
				$("#shadow_text_offsety").val(obj.shadow.offsetY);
				$("#shadow_text_colorpicker").spectrum("set", obj.shadow.color);

				updateShadowValues('text', obj.shadow);

			}

			//opacity	
			$("#opacity_text_value").val(obj.opacity / .01);
			$("#opacity_text_value_text").html("Opacity:&nbsp;&nbsp;" + (obj.opacity / .01));

		}
		else if (otype == "CzImage") {
			//border			
			if (obj.strokeWidth == 0 && obj.frame_round_border != null) //must be oval or circle
				$("#border_image_size").val(obj.my.strokeWidth);
			else if (obj.strokeWidth == 0) //we need to turn it back on.
				$("#border_image_size").val(1);
			else
				$("#border_image_size").val(obj.strokeWidth);


			if (obj.frame_round_border != null)
				$("#border_image_colorpicker").spectrum("set", obj.frame_round_border.stroke);
			else if (obj.stroke)
				$("#border_image_colorpicker").spectrum("set", obj.stroke);
			// if (obj.strokeLineJoin)
			// 	$("#border_image_corners").val(obj.strokeLineJoin);
			if (obj.strokeDashArray)
				$("#border_image_line_style").val($.isEmptyObject(obj.strokeDashArray) ? 'solid' : 'dashed');

			if (obj.my) {
				$("#border_image_status").val(obj.my.hasBorder);
				$("#border_image_frame_style").val(obj.my.frame_style);
				borderFrameState(obj.my.frame_style); //update the options show/hide
				$("#border_image_frame_radius").val(obj.my.radius);
				$("#border_image_frame_radius_offsetx").val(obj.my.offsetx);
				$("#border_image_frame_radius_offsety").val(obj.my.offsety);
				$("#border_image_frame_radius_width").val(obj.my.oval_width);
				$("#border_image_frame_radius_height").val(obj.my.oval_height);
				$('#border_image_radius').val(obj.my.corner_radius);
				// $('#border_image_corners').val(obj.my.strokeLineJoin);
				$('#border_image_colorpicker').val(obj.my.stroke);
				UpdateFrameValues(obj.my);
			}
			else {
				$("#border_image_status").val("OFF");
				updateImageFrameRadius(true);
			}

			//shadow
			if (obj.shadow) {
				$("#shadow_image_status").val('ON');
				$("#shadow_image_blur").val(obj.shadow.blur);
				$("#shadow_image_offsetx").val(obj.shadow.offsetX);
				$("#shadow_image_offsety").val(obj.shadow.offsetY);
				$("#shadow_image_colorpicker").spectrum("set", obj.shadow.color);

				updateShadowValues('image', obj.shadow);
			}

			//grayscale
			if (obj.my && obj.my.hasGrayscale && obj.my.hasGrayscale == 'ON')
				$("#grayscale_image_status").val('ON');
			else
				$("#grayscale_image_status").val('OFF');

			//brightness
			var b = 0;
			var x = findFilter(obj, 'Brightness');
			if (x != null)
				b = obj.filters[x].brightness * 100;
			// b = Math.round(obj.filters[x].brightness / 2.55);

			$("#brightness_image_value").val(b);
			updateBrightConValues("brightness", b);

			//contrast
			b = 0;
			var x = findFilter(obj, 'Contrast');
			if (x != null)
				b = obj.filters[x].contrast * 100;

			$("#contrast_image_value").val(b);
			updateBrightConValues("contrast", b);

			//opacity	
			$("#opacity_image_value").val(obj.opacity / .01);
			$("#opacity_image_value_text").html("Opacity:&nbsp;&nbsp;" + (obj.opacity / .01));

		}

	}

	canvas.on('object:scaling', function (e) {
		var obj = canvas.getActiveObject();
		if ($(".all_menus").is(":visible"))
			$(".all_menus").hide();

		//limit scale of object to 3 times
		xlimit = ylimit = 30 * globalScale;

		if (obj.scaleX > xlimit)
			obj.scaleX = xlimit;

		if (obj.scaleY > ylimit)
			obj.scaleY = ylimit;

		//limit scale to smallest.
		xmin = ymin = .05 * globalScale;

		if (obj.scaleX < xmin)
			obj.scaleX = xmin;

		if (obj.scaleY < ymin)
			obj.scaleY = ymin;

	});

	canvas.on('object:rotating', function (e) {
		$(".all_menus").hide();
	});

	canvas.on('object:modified', function (e) {
		var obj = canvas.getActiveObject();
		adjust_menu(obj);
		dirty = true;
		saveState();
	});

	function adjust_menu(obj) {
		if (!obj)
			return;
		if (otype == "CzImage") {

			$(".image_menus").hide();

			var bound = obj.getBoundingRect();

			var width = bound.width;
			var height = bound.height;
			var left = bound.left;
			var top = bound.top;

			bot_image_menu_left = left;
			if (width < bot_image_menu_width)
				bot_image_menu_left = left - (bot_image_menu_width - width) / 2;
			else if (width > bot_image_menu_width)
				bot_image_menu_left = left + (width - bot_image_menu_width) / 2;

			top_image_menu_left = left;
			if (width < top_image_menu_left)
				top_image_menu_left = left - (top_image_menu_width - width) / 2;
			else if (width > top_image_menu_left)
				top_image_menu_left = left + (width - top_image_menu_width) / 2;

			$("#top_image_menu").css(
				{
					position: "absolute",
					top: (top - menu_height - top_image_menu_offset) + "px",
					left: top_image_menu_left + "px"
				});

			$("#bot_image_menu").css(
				{
					position: "absolute",
					top: (top + height + menu_offset) + "px",
					left: bot_image_menu_left + "px"
				});

			$(".image_menus").show();
		}
		else if (otype == "Textbox") {
			$(".text_menus").hide();

			var bound = obj.getBoundingRect();

			var width = bound.width;
			var height = bound.height;
			var left = bound.left;
			var top = bound.top;

			bot_text_menu_left = left;
			if (width < bot_text_menu_width)
				bot_text_menu_left = left - (bot_text_menu_width - width) / 2;
			else if (width > bot_text_menu_width)
				bot_text_menu_left = left + (width - bot_text_menu_width) / 2;

			top_text_menu_left = left;
			if (width < top_text_menu_left)
				top_text_menu_left = left - (top_text_menu_width - width) / 2;
			else if (width > top_text_menu_left)
				top_text_menu_left = left + (width - top_text_menu_width) / 2;

			$("#top_text_menu").css(
				{
					position: "absolute",
					top: (top - menu_height - top_text_menu_offset) + "px",
					left: top_text_menu_left + "px"
				});

			$("#bot_text_menu").css(
				{
					position: "absolute",
					top: (top + height + menu_offset) + "px",
					left: bot_text_menu_left + "px"
				});

			$(".text_menus").show();

		}

	}

	function preventDragOffCanvas(e) {

		var obj = e.target;

		var halfw = obj.getScaledWidth() / 2;
		var halfh = obj.getScaledHeight() / 2;
		var bounds = {
			tl: { x: -halfw, y: -halfh },
			br: { x: obj.canvas.width - halfw, y: obj.canvas.height - halfh }
		};

		// top-left  corner
		if (obj.top < bounds.tl.y || obj.left < bounds.tl.x) {
			obj.top = Math.max(obj.top, bounds.tl.y);
			obj.left = Math.max(obj.left, bounds.tl.x)
		}

		// bot-right corner
		if (obj.top > bounds.br.y || obj.left > bounds.br.x) {
			obj.top = Math.min(obj.top, bounds.br.y);
			obj.left = Math.min(obj.left, bounds.br.x)
		}

	}

	canvas.on('mouse:up', function (e) {
		$(".all_menus").show()

		if (!cropping && (e.target && e.target.type))
			adjust_menu(e.target);

	});

	canvas.on('object:moving', function (e) {
		if (ignoreNextMove) //this is to fix Chrom bug that fires move after mouse down
		{
			ignoreNextMove = false;
			return false;
		}
		if (!cropping) {
			$(".all_menus").hide();
			preventDragOffCanvas(e);

			if (snap_grid && grid_showing) {
				//snap to grid			
				e.target.set({
					left: (Math.round(e.target.left / (grid_size * globalScale)) * (grid_size * globalScale)) + (safe * globalScale),
					top: (Math.round(e.target.top / (grid_size * globalScale)) * (grid_size * globalScale)) + (safe * globalScale)
				});
			}
		}

	});

	var was_x, was_y;
	var crop_move_timer;
	var crop_move_timer_set = false;
	var posX, posY, pointer, deltaX, deltaY;
	var clearMouseUpSet = false;
	var ignoreNextMove = false;

	canvas.on('mouse:down', function (e) {
		ignoreNextMove = true;

		if (!cropping) {
			if (!e.target || !e.target.type) {
				$(".all_menus").remove();
			} else {
				//$(".all_menus").remove();	
			}
		}
		else {
			//check if object not clicked anymore.
			var id = canvas.getObjects().indexOf(e.target);

			//get the active object and compare to the current object.
			//var active_obj = canvas.getActiveObject();
			//var active_id = canvas.getObjects().indexOf(active_obj);


			//reset the crop mode in case.
			if (id != cur_id) {
				resetCropMode();
				$(".all_menus").remove();
				//canvas.renderAll();	
				return false;
			}

			pointer = canvas.getPointer(e.e);
			was_x = pointer.x;
			was_y = pointer.y;

			canvas.on('mouse:move', function (e) {

				if (cropping) {
					if (!crop_move_timer_set) {

						crop_move_timer_set = true;

						var crop_move_timer = setTimeout(function () {

							crop_move_timer_set = false;

							pointer = canvas.getPointer(e.e);

							deltaX = was_x - pointer.x;
							deltaY = was_y - pointer.y;

							zc.zoomBy(deltaX, deltaY, 0);

							//log the position again.
							was_x = pointer.x;
							was_y = pointer.y;

						}, 50);


						if (clearMouseUpSet == false) {

							function clearMouseUp(e) {
								clearMouseUpSet = false;
								canvas.off('mouse:move');
								canvas.off('mouse:up', clearMouseUp);
								//update border and filters now
								updateAfterZoom(false, true, true);
								//saveState();
							}

							canvas.on('mouse:up', clearMouseUp);

							clearMouseUpSet = true;

						}

					}
				}
			});
		}

	});

	const toValidFilterValue = (e) => {
		let val
		if (e > 1) val = 1
		else if (e < -1) val = -1
		else val = e

		return val
	}

	var applyImageFilters = function () {
		canvas.forEachObject(function (obj) {
			if (obj.type === 'CzImage') {
				if (obj.tempFilters && obj.tempFilters.length) {
					obj.tempFilters.map(e => {
						if (e.type === "Brightness") {
							obj.filters.push(new fabric.Image.filters.Brightness({ brightness: toValidFilterValue(e.brightness) }))
						} else if (e.type === "Contrast") {
							obj.filters.push(new fabric.Image.filters.Contrast({ contrast: toValidFilterValue(e.contrast) }))
						} else {
							obj.filters.push(new fabric.Image.filters.Grayscale());
						}
					})
				} else {
					obj.filters = [new fabric.Image.filters.Brightness({ brightness: 0.01 })]
				}
				obj.applyFilters();
			}
		});
		canvas.renderAll()
	}

	function applyImageBorders() {
		canvas.forEachObject(function (obj) {
			if (obj.type === 'CzImage' && obj.graphic != 'border' && !obj.panel) {
				//if we have a bunch of data to use to apply border then....	
				if ((('clipPath' in obj) || ('clipTo' in obj)) && (obj.clipPath || obj.clipTo) && ('my' in obj)
					&& obj.my.hasBorder == 'ON' && ('frame_round_border' in obj) && obj.frame_round_border && ('hasBorder' in obj.my)) {
					zc.frame_round_border(obj.frame_round_border, obj);
				}
				else if (('cropX' in obj || 'cropY' in obj) || (obj.cx != 0 || obj.cy != 0 || obj.cw != obj.width || obj.ch != obj.height)) {
					zc.frame_round_border(null, obj);
				}
			}
		});
	}

	function applyStateProperties() {
		//return false;
		canvas.forEachObject(function (obj) {
			if (obj.type === 'CzImage') {
				obj.stateProperties.push(
					'borderDashArray',
					'filters',
					'frame_round_border',
					'my',
					'cw',
					'ch',
					'clipPath'
				);
				obj.saveState();
			}
			else if (obj.type === 'Textbox') {
				obj.stateProperties.push(
					'borderDashArray',
					'filters',
					'my',
				);

				obj.saveState();
			}
		});
	}

	//customize controls
	var controlSize = 25

	fabric.Object.prototype.setControlsVisibility({
		tl: false, //top-left
		mt: false, // middle-top
		tr: false, //top-right
		ml: false, //middle-left
		mr: false, //middle-right
		bl: true, // bottom-left
		mb: false, //middle-bottom
		br: true, //bottom-right
		mtr: false
	});

	const blControl = new fabric.Control({
		x: -0.5,
		y: 0.5,
		actionHandler: fabric.controlsUtils.rotationWithSnapping,
		cursorStyleHandler: () => 'url(' + rotationCursorSRC + '), default' ,
		withConnection: true,
		actionName: 'rotate',
		render: (ctx, left, top) => {
			var rotate = new Image();
			ctx.save();
			rotate.onload = function(){
				ctx.drawImage(rotate, left - controlSize / 2, top - controlSize / 2 , controlSize, controlSize);
			};
			rotate.src = rotateSRC;
			ctx.restore();
		}
	});
	const brTextBox = new fabric.Control({
		x: 0.5,
		y: 0.5,
		actionHandler: fabric.controlsUtils.changeWidth,
		cursorStyleHandler: () => 'w-resize',
		actionName: 'resizing',
		render: (ctx, left, top, style, obj) => {
			var scale = new Image();
			scale.src = scale2SRC;
			scale.onload = function(){    
				ctx.save();
				ctx.translate(left, top);
				ctx.rotate(obj.angle * Math.PI / 180)
				ctx.translate(-left, -top);
				ctx.drawImage(scale, left - controlSize / 2, top - controlSize / 2 , controlSize, controlSize);
				ctx.restore();
			};
		}
	});
	const brControl = new fabric.Control({
		x: 0.5,
		y: 0.5,
		actionHandler: fabric.controlsUtils.scalingEqually,
		cursorStyleHandler: () => 'se-resize',
		render: (ctx, left, top, style, obj) => {
			var scale = new Image();
			scale.src = scale1SRC;
			scale.onload = function(){    
				ctx.save();
				ctx.translate(left, top);
				ctx.rotate(obj.angle * Math.PI / 180)
				ctx.translate(-left, -top);
				ctx.drawImage(scale, left - controlSize / 2, top - controlSize / 2 , controlSize, controlSize);
				ctx.restore();
			};
		}
	});

	fabric.Textbox.prototype.controls.bl = blControl
	fabric.Textbox.prototype.controls.br = brTextBox
	fabric.Image.prototype.controls.bl = blControl
	fabric.Image.prototype.controls.br = brControl

	$("#add_text").click(function (e) {
		addText();
		dirty = true;
		saveState();
	});

	var theRemovedObject;

	$('#canvas_div').on('click', ".delete_btn", function (e) {
		if (!confirm("Are you sure you want to remove this?")) return false;
		var obj = canvas.getActiveObject();
		theRemovedObject = obj;
		canvas.remove(obj);
		//update green check on image.
		updateGreenMark('remove', theRemovedObject);
		$(".all_menus").remove();
		dirty = true;
		removedObject = true;
		saveState();
	});

	var sendObjectBack = sendObjectFront = false;

	$('#canvas_div').on('click', ".send_back", function (e) {
		//make sure we dont go under grid.
		var obj = canvas.getActiveObject();
		var id = canvas.getObjects().indexOf(obj) - 1;
		var _obj = canvas._objects[id];
		if (_obj.bottom == true)
			return false;

		canvas.getActiveObject().sendBackwards();
		dirty = true;
		sendObjectBack = true;
		saveState();
		sendObjectBack = false;
	});

	$('#canvas_div').on('click', ".bring_front", function (e) {

		//make sure we dont go above bleed lines.
		var obj = canvas.getActiveObject();
		var id = canvas.getObjects().indexOf(obj) + 1;
		var _obj = canvas._objects[id];
		if (_obj && _obj.bottom && _obj.bottom == true)
			return false;

		canvas.getActiveObject().bringForward();
		dirty = true;
		sendObjectFront = true;
		saveState();
		sendObjectFront = false;
	});

	var last_id;
	$('#canvas_div').on('click', ".crop_mode", function (e) {
		if (!$("#zoom_div").is(":visible")) {
			canvas.item(cur_id).lockMovementX = canvas.item(cur_id).lockMovementY = true;
			canvas.item(cur_id).lockScalingX = canvas.item(cur_id).lockScalingY = true;
			canvas.item(cur_id).lockRotation = true;
			canvas.item(cur_id).setControlsVisibility({
				br: false, // bottom right
				bl: false, // bottom left	
			});
			cropping = true;
			last_id = cur_id;

			//canvas.renderAll();

			$("#zoom_div, .image_menu_divs").toggle();
			//enable crop if not circle or oval.
			if ($("#border_image_frame_style").val() == "square")
				$(".set_crop").removeAttr("disabled");
			else
				$(".set_crop").attr("disabled", true);


		}
		else
			resetCropMode();

	});

	$('#canvas_div').on('click', ".set_crop", function (e) {
		if ($("#crop_div").is(":visible")) {
			$(this).attr("disabled", true);
			return false;
		}

		var obj = canvas.getActiveObject();
		var w = obj.getScaledWidth();
		var h = obj.getScaledHeight();
		var top = h;
		var left = w;

		var bound = obj.getBoundingRect();
		var width = bound.width;
		var height = bound.height;
		var _left = bound.left;
		var _top = bound.top;

		if (obj.angle != 0) {
			var html = '<div id="crop_parent" style="width:' + width + 'px;height:' + height + 'px;top:' + _top + 'px;left:' + _left + 'px; position:absolute;background:transparent;pointer-events:none;">'; //to contain the drag
			html += '	<div id="crop_div" style="width:' + w * .5 + 'px;height:' + h * .5 + 'px;top:' + (top / 2) + 'px;left:' + (left / 2) + 'px;pointer-events:auto;"></div></div>';
		}
		else {
			var html = '<div id="crop_parent" style="width:' + w + 'px;height:' + h + 'px;top:' + obj.top + 'px;left:' + obj.left + 'px; position:absolute;background:transparent;pointer-events:none;">'; //to contain the drag
			html += '	<div id="crop_div" style="width:' + w * .5 + 'px;height:' + h * .5 + 'px;top:' + (top / 4) + 'px;left:' + (left / 4) + 'px;pointer-events:auto;"></div></div>';
		}

		$('#canvas_div').append(html);
		$("#crop_div").resizable(
			{
				handles: "n, e, s, w, nw, ne, sw,se",
				containment: "parent"
			});
		$("#crop_div").draggable(
			{
				containment: "parent"
			});

		//$("#crop_parent").css("border","1px solid red");

		if (obj.angle != 0)
			$("#crop_div").rotate(obj.angle, { x: 'left', y: 'top' });

		$(".crop_now").removeAttr("disabled");
		$(this).attr("disabled", true);

	});

	//prevents window resize trigger
	$('#canvas_div').on('resize', "#crop_div", function (e) {
		e.stopPropagation();
	});

	$('#canvas_div').on('click', ".crop_now", function (e) {
		if (!$("#crop_div").is(":visible")) {
			$(".set_crop").removeAttr("disabled");
			$(".crop_now").attr("disabled", true);
			return false;
		}

		zc.crop(false, false);


		$("#crop_parent").remove();
		$(".set_crop").removeAttr("disabled");
		$(".crop_now").attr("disabled", true);
		dirty = true;
		croppedObject = true;
		saveState();

	});

	var ignoreStateSave = false;

	$('#canvas_div').on('click', ".exit_crop_mode", function (e) {
		//update border and filters now
		updateAfterZoom(true, true, true);
		ignoreStateSave = true;
	});

	function updateAfterZoom(reset, filter, border) {

		//we need two timers because we need time for all to settle down.
		setTimeout(function () {
			if (border) {
				var d = GetFrameValues();
				var data = {
					stroke: 1,
					strokeWidth: 1,
					strokeDashArray: 1,
					strokeLineJoin: 1,
					oval_width: d.oval_width,
					oval_height: d.oval_height,
					radius: d.radius
				}
				updateImageBorder(data, false);
			}

			setTimeout(function () {
				if (filter) {
					var obj = canvas.getActiveObject();
					obj.applyFilters();
					canvas.requestRenderAll();
				}
				if (reset)
					resetCropMode();
			}, 200);


		}, 100);

		dirty = true;
		//saveState();		

	}

	function resetCropMode() {
		canvas.off('mouse:move');
		cropping = false;
		canvas.item(last_id).lockMovementX = canvas.item(last_id).lockMovementY = false;
		canvas.item(last_id).lockScalingX = canvas.item(last_id).lockScalingY = false;
		canvas.item(last_id).lockRotation = false;
		canvas.item(last_id).setControlsVisibility({
			br: true, // bottom right
			bl: true, // bottom left	
		});
		$("#crop_parent").remove();

		$("#zoom_div").hide();
		$(".image_menu_divs").show();
	}

	var crop_timer, zoom_once;
	var crop_timer_set = false, zoom_reset = false;
	$('#canvas_div').on('mousedown', ".crop_btn", function (e) {

		//if image is not zoomed we dont want to let arrows work.		
		var obj = canvas.getActiveObject();
		if (obj.width == obj.cw && obj.height == obj.ch && (this.width >= this.origWidth && this.height >= this.origHeight))
			//if clicking arrow not zoom in or out
			if (!$(this).hasClass("zoom-in"))
				return false;

		if (!crop_timer_set) {
			zoom_once = 0;
			zoom_reset = false;
			var _this = $(this);
			crop_timer = setInterval(function () { zoomThis(_this); }, 220);
			crop_timer_set = true;
			dirty = true;
			//saveState();
		}

	});

	$('#canvas_div').on('mouseup', ".crop_btn", function (e) {

		if (crop_timer_set) {
			//need to at least gone one zoom.
			if (zoom_once > 0)
				resetZoomTimer();
			else {
				zoom_reset = true;
				return false;
			}
		}


	});


	function resetZoomTimer() //reset the zoomtimer.
	{
		crop_timer_set = false;
		clearInterval(crop_timer);
		ignoreStateSave = true;
		//update border and filters now
		if (!skipAfterZoom)
			updateAfterZoom(false, true, true);
		else
			skipAfterZoom = false;

		zoom_reset = false;
		zoom_once = 0;
		//saveState();		
	}

	function zoomThis(_this) {

		if (zoom_reset && zoom_once > 0)
			resetZoomTimer()
		else {

			zoom_once++;

			// This will repeat //
			if (_this.hasClass("zoom-in"))
				zc.zoomBy(0, 0, 10);
			else if (_this.hasClass("zoom-out"))
				zc.zoomBy(0, 0, -10);
			else if (_this.hasClass("arrow-left"))
				zc.zoomBy(-5, 0, 0);
			else if (_this.hasClass("arrow-up")) {
				zc.zoomBy(0, -5, 0);
			}
			else if (_this.hasClass("arrow-down"))
				zc.zoomBy(0, 5, 0);
			else if (_this.hasClass("arrow-right"))
				zc.zoomBy(5, 0, 0);

		}

	}

	var clonedObject = false;

	$('#canvas_div').on('click', ".copy_object", function (e) {

		var obj = canvas.getActiveObject();
		var clone;

		if ($(this).hasClass("copy_text"))
			clone = fabric.Textbox.fromObject(obj.toObject());
		else if ($(this).hasClass("copy_image"))
			clone = $.extend(true, {}, obj);
		else
			return false;

		clone.set({
			top: clone.get('top') + (200 * globalScale),
			left: clone.get('left') + (100 * globalScale),
			itemID: itemID++
		});

		canvas.add(clone).setActiveObject(clone);
		dirty = true;
		clonedObject = true;
		saveState();
	});

	//Brightness-Contrast filter
	$('#canvas_div').on('click', ".brightcon_image_btn", function (e) {
		$("#brightcon_image_div").show();
		$("#bottom_image_menu_div").hide();
		$("#top_image_menu").css("visibility", "hidden");

	});

	//var filters = ['grayscale','brightness','contrast'];

	function findFilter(obj, filter) //search for the filter we need. Cant think of any other way to do this.
	{
		var index = null;

		if (obj.filters.length > 0) {
			$.each(obj.filters, function (k, v) {
				if (v && v.type.toLowerCase() == filter.toLowerCase()) {
					index = k;
					return false;
				}
			});
		}
		return index;
	}


	$('#canvas_div').on('change', "#brightness_image_value", function (e) {
		var obj = canvas.getActiveObject();
		var b = Number($("#brightness_image_value").val());

		updateBrightConValues("brightness", b);

		var x = findFilter(obj, 'Brightness');
		// var val = Math.round(b * 2.55) / 100;
		var val = b / 100

		if (b != 0 && x == null)
			obj.filters.push(new fabric.Image.filters.Brightness({ brightness: val }));
		else if (b != 0 && x >= 0)
			obj.filters[x].brightness = val;
		else
			delete obj.filters[x ? x : 0];

		obj.applyFilters();
		canvas.requestRenderAll();
		dirty = true;
		saveState();

	});

	$('#canvas_div').on('change', "#contrast_image_value", function (e) {
		var obj = canvas.getActiveObject();
		var b = Number($("#contrast_image_value").val());

		updateBrightConValues("contrast", b);

		var x = findFilter(obj, 'Contrast');
		var val = b / 100;

		if (b != 0 && x == null)
			obj.filters.push(new fabric.Image.filters.Contrast({ contrast: val }));
		else if (b != 0 && x >= 0)
			obj.filters[x].contrast = val;
		else
			delete obj.filters[x ? x : 0];

		obj.applyFilters();
		canvas.requestRenderAll();
		dirty = true;
		saveState();
	});

	$('#canvas_div').on('click', ".exit_image_brightcon_mode", function (e) {
		resetBrightConMode();
	});

	function resetBrightConMode() {
		$("#brightcon_image_div").hide();
		$("#bottom_image_menu_div").show();
		$("#top_image_menu").css("visibility", "");
	}

	function updateBrightConValues(o, v) {
		if (o == "brightness")
			$("#brightness_image_value_text").html("Brightness:&nbsp;&nbsp;" + v);
		else if (o == "contrast")
			$("#contrast_image_value_text").html("Contrast:&nbsp;&nbsp;" + v);
	}

	//Opacity
	$('#canvas_div').on('click', ".opacity_image_btn, .opacity_text_btn", function (e) {

		var a;

		if ($(this).hasClass("opacity_image_btn"))
			a = "image";
		else if ($(this).hasClass("opacity_text_btn"))
			a = "text";

		$("#opacity_" + a + "_div").show();
		$("#bottom_" + a + "_menu_div").hide();
		$("#top_" + a + "_menu").css("visibility", "hidden");

	});


	$('#canvas_div').on('change', "#opacity_image_value,#opacity_text_value", function (e) {

		var obj = canvas.getActiveObject();
		var id = $(this).attr("id");
		var a;

		if (id == "opacity_image_value")
			a = "image";
		else if (id == "opacity_text_value")
			a = "text";

		var opacity = $("#opacity_" + a + "_value").val();
		$("#opacity_" + a + "_value_text").html("Opacity:&nbsp;&nbsp;" + opacity);

		obj.set("opacity", opacity * .01);

		canvas.renderAll();
		dirty = true;
		saveState();

	});

	$('#canvas_div').on('click', "#exit_image_opacity_mode, #exit_text_opacity_mode", function (e) {
		var a;
		var id = $(this).attr("id");

		if (id == "exit_image_opacity_mode")
			a = "image";
		else if (id == "exit_text_opacity_mode")
			a = "text";

		resetOpacityMode(a);
	});

	function resetOpacityMode(a) {
		$("#opacity_" + a + "_div").hide();
		$("#bottom_" + a + "_menu_div").show();
		$("#top_" + a + "_menu").css("visibility", "");
	}

	//Grayscale filter
	$('#canvas_div').on('click', ".grayscale_image_btn", function (e) {
		$("#grayscale_image_div").show();
		$("#bottom_image_menu_div").hide();
		$("#top_image_menu").css("visibility", "hidden");
	});

	$('#canvas_div').on('change', "#grayscale_image_status", function (e) {

		var r = $("#grayscale_image_status").val();
		var obj = canvas.getActiveObject();

		if (!('my' in obj))
			obj.my = new Object();

		if (r == "ON") {
			obj.my.hasGrayscale = 'ON';
			obj.filters.push(new fabric.Image.filters.Grayscale());
		}
		else {
			var x = findFilter(obj, 'Grayscale');
			obj.my.hasGrayscale = 'OFF';
			delete obj.filters[x ? x : 0];
		}

		obj.applyFilters();
		canvas.requestRenderAll();
		dirty = true;
		saveState();

	});

	$('#canvas_div').on('click', ".exit_image_grayscale_mode", function (e) {
		resetGrayscaleMode();
	});

	function resetGrayscaleMode() {
		$("#grayscale_image_div").hide();
		$("#bottom_image_menu_div").show();
		$("#top_image_menu").css("visibility", "");
	}


	//Shadow 
	$('#canvas_div').on('click', ".shadow_image_btn, .shadow_text_btn", function (e) {

		var a;

		if ($(this).hasClass("shadow_image_btn"))
			a = "image";
		else if ($(this).hasClass("shadow_text_btn"))
			a = "text";

		$("#shadow_" + a + "_div").show();
		$("#bottom_" + a + "_menu_div").hide();
		$("#top_" + a + "_menu").css("visibility", "hidden");

	});


	function updateShadow(_this, a) {

		var r = $("#shadow_" + a + "_status").val();
		var obj = canvas.getActiveObject();
		var b = new Object();
		b.blur = Number($("#shadow_" + a + "_blur").val());
		b.offsetX = Number($("#shadow_" + a + "_offsetx").val());
		b.offsetY = Number($("#shadow_" + a + "_offsety").val());

		updateShadowValues(a, b);

		if (r == "ON") {
			var shadow = {
				color: $("#shadow_" + a + "_colorpicker").spectrum("get").toRgbString(),
				blur: b.blur,
				offsetX: b.offsetX,
				offsetY: b.offsetY,
				affectStroke: false
			}
		}
		else
			var shadow = null;

		obj.shadow = shadow;
		// obj.hasBorders = false;
		canvas.renderAll();

	}

	$('#canvas_div').on('change', ".shadow_image, .shadow_text", function (e) {
		var a;

		if ($(this).hasClass("shadow_image"))
			a = "image";
		else if ($(this).hasClass("shadow_text"))
			a = "text";

		updateShadow($(this), a);
		dirty = true;
		saveState();

	});

	$('#canvas_div').on('click', ".exit_image_shadow_mode, .exit_text_shadow_mode", function (e) {
		var a;

		if ($(this).hasClass("exit_image_shadow_mode"))
			a = "image";
		else if ($(this).hasClass("exit_text_shadow_mode"))
			a = "text";

		resetShadowMode(a);
	});

	function resetShadowMode(a) {
		$("#shadow_" + a + "_div").hide();
		$("#bottom_" + a + "_menu_div").show();
		$("#top_" + a + "_menu").css("visibility", "");
	}

	function updateShadowValues(a, b) {
		$("#shadow_" + a + "_blur_text").html("Blur:&nbsp;&nbsp;" + b.blur);
		$("#shadow_" + a + "_offsetx_text").html("Offset-X:&nbsp;&nbsp;" + b.offsetX);
		$("#shadow_" + a + "_offsety_text").html("Offset-Y:&nbsp;&nbsp;" + b.offsetY);
	}

	//Border - Image
	//image and text
	$('#canvas_div').on('click', ".border_image_btn, .font_text_btn", function (e) {
		var a, b, d;

		if ($(this).hasClass("border_image_btn")) {
			a = "border_image";
			b = "image";
		}
		else if ($(this).hasClass("font_text_btn")) {
			a = "font_text";
			b = "text";
		}

		$("#" + a + "_div").show();
		$("#bottom_" + b + "_menu_div").hide();
		$("#top_" + b + "_menu").css("visibility", "hidden");

		if (b == "image") {
			d = GetFrameValues();
			UpdateFrameValues(d);
		}
		else if (b == "text") {
			d = GetTextValues();
			UpdateTextValues(d);
		}

	});

	function UpdateTextValues(d) {
		$("#font_text_fontlineheight_text").html("Line Height:&nbsp;&nbsp;" + d.lineHeight);
		$("#font_text_fontstrokewidth_text").html("Stroke Width:&nbsp;&nbsp;" + d.strokeWidth);
	}

	function GetTextValues() {
		var d = {
			lineHeight: $("#font_text_fontlineheight").val(),
			strokeWidth: $("#font_text_fontstrokewidth").val(),
		}

		return d;
	}

	$('#canvas_div').on('change', ".font_option", function (e) {
		var id = $(this).attr("id");
		var data;

		if (id == "font_text_fontsize")
			data = { fontSize: 1 }
		else if (id == "font_text_fontfamily")
			data = { fontFamily: 1 }
		else if (id == "font_text_color_colorpicker")
			data = { fill: 1 }
		else if (id == "font_text_textalign")
			data = { textAlign: 1 }
		else if (id == "font_text_fontlineheight")
			data = { lineHeight: 1 }
		else if (id == "font_text_fontstrokewidth")
			data = { strokeWidth: 1 }
		else if (id == "font_text_fontstroke_colorpicker")
			data = { stroke: 1 }
		else if (id == "font_text_fontstyle")
			data = { fontStyle: 1 }
		else if (id == "font_text_textdecoration")
			data = { textDecoration: 1 }
		else if (id == "font_text_fontweight")
			data = { fontWeight: 1 }

		updateText(data);
		dirty = true;
		saveState();
	});



	$('#canvas_div').on('click', "#exit_font_text_mode", function (e) {
		resetFontMode();
	});

	function resetFontMode() {
		$("#font_text_div").hide();
		$("#bottom_text_menu_div").show();
		$("#top_text_menu").css("visibility", "");
	}

	function updateText(data) {

		var obj = canvas.getActiveObject();


		var d = GetTextValues();
		UpdateTextValues(d);

		var fontSize = Number($("#font_text_fontsize").val());
		var fontFamily = $("#font_text_fontfamily option:selected").css("font-family");
		var fill = $("#font_text_color_colorpicker").spectrum("get").toRgbString();
		var textAlign = $("#font_text_textalign").val();
		//grab fontstyle from the select.
		var fontStyle = $("#font_text_fontfamily option:selected").css("font-style"); //$("#font_text_fontstyle").val();
		var textDecoration = $("#font_text_textdecoration").val();
		//grab fontweight from the select.
		var fontWeight = $("#font_text_fontfamily option:selected").css("font-weight"); //$("#font_text_fontweight").val();
		if (fontWeight == "400")
			fontWeight = "normal";
		else if (fontWeight == "700")
			fontWeight = "bold";
		var lineHeight = Number(d.lineHeight);
		var stroke = $("#font_text_fontstroke_colorpicker").spectrum("get").toRgbString();
		var strokeWidth = Number(d.strokeWidth);


		if (data.fontFamily || data.fontStyle || data.fontWeight) {
			obj.set('fontFamily', fontFamily);
			obj.set('fontStyle', fontStyle);
			obj.set('fontWeight', fontWeight);
		}
		if (data.fontSize)
			obj.set('fontSize', fontSize);
		if (data.fill)
			obj.set('fill', fill);
		if (data.textAlign)
			obj.set('textAlign', textAlign);
		if (data.textDecoration)
			obj.set('textDecoration', textDecoration);
		if (data.lineHeight)
			obj.set('lineHeight', lineHeight);
		if (data.stroke)
			obj.set('stroke', stroke);
		if (data.strokeWidth)
			obj.set('strokeWidth', strokeWidth);


		canvas.renderAll();
		adjust_menu(obj);

	}


	//for testing to see the boundary of an object.
	/*	canvas.on('after:render', function() {
			canvas.contextContainer.strokeStyle = '#555';
		
			canvas.forEachObject(function(obj) {
			  if (obj.type !== 'CzImage') return false; 
			  var bound = obj.getBoundingRect();
		
			  canvas.contextContainer.strokeRect(
				bound.left + 0.5,
				bound.top + 0.5,
				bound.width,
				bound.height
			  );
			})		
			
		  });*/

	function roundedImage(ctx, x, y, width, height, radius) {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}

	function updateImageBorder(data, next) {

		var r = $("#border_image_status").val();
		var f = $("#border_image_frame_style").val();
		var obj = canvas.getActiveObject();
		var render = false;
		// var render = true;
		if (!obj)
			return;
		if (!('my' in obj))
			obj.my = new Object();

		if (r == "ON") {
			obj.my.hasBorder = 'ON';

			var stroke = $("#border_image_colorpicker").spectrum("get").toRgbString();
			var strokeWidth = Number($("#border_image_size").val());
			var strokeDashArray = $("#border_image_line_style").val() == 'dashed' ? [15, 10] : [];
			// var strokeLineJoin = $("#border_image_corners").val();

			// if (f == "square" && strokeLineJoin == "miter")
			// {
			// 	if (data.stroke)
			// 		obj.stroke = stroke;
			// 	if (data.strokeWidth)
			// 		obj.strokeWidth = strokeWidth;
			// 	if (data.strokeDashArray)
			// 		obj.strokeDashArray = strokeDashArray;
			// 	if (data.strokeLineJoin)
			// 		obj.strokeLineJoin = strokeLineJoin;
			//
			// 	zc.frame_round_border(null,obj);
			//
			// 	if (next) //don't repeat
			// 		updateImageFrameRadius(false);
			// 	else
			// 		render = true;
			// }
			// else
			{

				if (obj.type === 'CzImage' && obj.filters.length)
					//set opacity while modify this.
					obj.set("opacity", .1);

				data = GetFrameValues();
				obj.strokeWidth = 0;

				//round border
				var radius = $("#border_image_frame_radius").val();

				//oval border
				var rx = Number(data.oval_width);
				var ry = Number(data.oval_height);

				var ow = obj.get('width'); //this seems to get the orignial width where getWidth gets the current width.
				var oh = obj.get('height');


				var cir = {
					radius: Number(radius),
					rx: rx,
					ry: ry,
					stroke: stroke,
					ow: ow,
					oh: oh,
					offsetx: Number($("#border_image_frame_radius_offsetx").val()),
					offsety: Number($("#border_image_frame_radius_offsety").val()),
					strokeWidth: strokeWidth * 2, //double it up since its on the edge half gets cut out
					strokeDashArray: strokeDashArray,
					style: f
				};

				//save the border values to obj.my since
				obj.my.strokeWidth = strokeWidth;

				zc.frame_round_border(cir, obj);

				if (next) //don't repeat
					updateImageFrameRadius(false);
				else
					render = true;
			}
		}
		else {

			obj.my.hasBorder = 'OFF';

			//remove border	
			obj.stroke = '#000000';
			obj.strokeWidth = 0;
			obj.strokeDashArray = [];
			obj.strokeLineJoin = 'miter';

			zc.frame_round_border(null, obj);

			if (next)
				updateImageFrameRadius(false);
			else
				render = true;

		}

		if (render)
			renderAfter(obj);

	}

	function renderAfter(obj) {
		var o = $("#opacity_image_value").val();

		if (obj.type === 'CzImage' && obj.filters.length)
			setTimeout(function () {
				obj.applyFilters();
				canvas.requestRenderAll();
				obj.set("opacity", o * .01);
				canvas.renderAll();
			}, 150);
		else {
			obj.set("opacity", o * .01);
			canvas.renderAll();
		}
		dirty = true;

		//if zoomed or exit crop then lets not bother saving it.		
		if (ignoreStateSave == false)
			saveState();
		else
			ignoreStateSave = false;

	}


	$('#canvas_div').on('change', "#border_image_status", function (e) {

		var data =
		{
			stroke: 1,
			strokeWidth: 1,
			strokeDashArray: 1,
			strokeLineJoin: 1
		}
		updateImageBorder(data, true);

	});

	// $('#canvas_div').on('change', "#border_image_colorpicker", function(e)
	// {
	// 	var data =
	// 	{
	// 		stroke: 1,
	// 		strokeLineJoin: 1
	// 	}
	// 	updateImageBorder(data,true);
	// });

	$('#canvas_div').on('change.spectrum move.spectrum', "#border_image_colorpicker", function (e) {
		var data =
		{
			stroke: 1,
			strokeLineJoin: 1
		}
		updateImageBorder(data, true);
	});

	$('#canvas_div').on('change', "#border_image_size", function (e) {
		var data =
		{
			strokeWidth: 1
		}
		updateImageBorder(data, true);
	});

	// $('#canvas_div').on('change', "#border_image_corners", function(e)
	// {
	// 	var data =
	// 	{
	// 		strokeLineJoin: 1
	// 	}
	// 	updateImageBorder(data,true);
	// });

	$('#canvas_div').on('change', "#border_image_radius", function (e) {
		var data =
		{
			strokeLineJoin: 1
		}
		updateImageBorder(data, true);
	});

	$('#canvas_div').on('change', "#border_image_line_style", function (e) {
		var data = {
			strokeDashArray: 1,
		}
		updateImageBorder(data, true);
	});


	$('#canvas_div').on('change', ".image_frame_option,#border_image_frame_style", function (e) {
		var r = $("#border_image_frame_style").val();
		borderFrameState(r);

		updateImageFrameRadius(true);
	});

	function borderFrameState(r) {
		if (r == "round") {
			$(".image_frame").show();
			$(".image_frame_oval").hide();
			$('.border_image_radius_frame').hide();
		}
		else if (r == "oval") {
			$(".image_frame").show();
			$(".image_frame_round").hide();
			$('.border_image_radius_frame').hide();
		}
		else if (r == "square") {
			$(".image_frame").hide();
			$('.border_image_radius_frame').show();
		}

		//hide shadow if needed.	
		var b = $("#border_image_status").val();
		if ((r == "round" || r == "oval") && b == "ON")
			$(".shadow_image_btn").attr("disabled", true);
		else
			$(".shadow_image_btn").attr("disabled", false);
	}


	function UpdateFrameValues(d) {
		$("#border_image_frame_radius_text").html("Radius:&nbsp;&nbsp;" + d.radius);
		$("#border_image_frame_radius_offsetx_text").html("Offset-X:&nbsp;&nbsp;" + d.offsetx);
		$("#border_image_frame_radius_offsety_text").html("Offset-Y:&nbsp;&nbsp;" + d.offsety);
		$("#border_image_frame_radius_width_text").html("Width:&nbsp;&nbsp;" + d.oval_width);
		$("#border_image_frame_radius_height_text").html("Height:&nbsp;&nbsp;" + d.oval_height);
	}

	function GetFrameValues() {
		var d = {
			radius: $("#border_image_frame_radius").val(),
			offsetx: $("#border_image_frame_radius_offsetx").val(),
			offsety: $("#border_image_frame_radius_offsety").val(),
			oval_width: $("#border_image_frame_radius_width").val(),
			oval_height: $("#border_image_frame_radius_height").val()
		}

		return d;
	}

	function updateImageFrameRadius(next) {

		var st = $("#border_image_status").val();
		var obj = canvas.getActiveObject();
		var render = false;

		var d = GetFrameValues();
		UpdateFrameValues(d);

		if (!('my' in obj))
			obj.my = new Object();
		obj.my.radius = d.radius;
		obj.my.offsetx = d.offsetx;
		obj.my.offsety = d.offsety;
		obj.my.oval_width = d.oval_width;
		obj.my.oval_height = d.oval_height;

		var r = $("#border_image_frame_style").val();
		// var strokeLineJoin = $('#border_image_corners').val();
		obj.my.frame_style = r;
		// obj.my.strokeLineJoin = strokeLineJoin;
		if (st == "ON") //if border turned off remove clip, then send away to remove border.
		{
			obj.my.hasBorder = 'ON';

			// if (r == "round" || r == "oval" || (r == "square" && strokeLineJoin == "round"))
			// if (r == "round" || r == "oval" || (r == "square" && strokeLineJoin == "round"))
			{

				if (obj.type === 'CzImage' && obj.filters.length)
					//set opacity while modify this.
					obj.set("opacity", .1);

				obj.shadow = null;

				var ow = obj.get('width'); //this seems to get the orignial width where getWidth gets the current width.
				var oh = obj.get('height');

				if (r == "round") {

					//scale this radius to max of object width.
					if (ow > oh)
						var radius = ((d.radius / 100) * (oh / 2));
					else
						var radius = ((d.radius / 100) * (ow / 2));

					//this allows us to not let circle go outside bounds.
					var obj_ratiox = ((ow / 2) - radius) / (ow / 2);
					var obj_ratioy = ((oh / 2) - radius) / (oh / 2);

					var x = (((d.offsetx) / 100) * ((ow / 2) * obj_ratiox));
					var y = (((d.offsety) / 100) * ((oh / 2) * obj_ratioy));

					obj.my.x = x;
					obj.my.y = y;
					obj.my.circle_radius = radius;

					// obj.clipTo = function (ctx) {
					// 	ctx.arc(this.my.x, this.my.y, this.my.circle_radius, 0, Math.PI * 2, false);
					// }
					obj.clipPath = null
					obj.clipPath = new fabric.Circle({
						top: y,
						left: x,
						radius: radius,
						startAngle: 0,
						angle: Math.PI * 2,
						originX: "center",
						originY: "center"
					})
				}
				else if (r == "square") {
					var rx = d.oval_width;
					var ry = d.oval_height;

					//scale this radius to max of object width.
					var _rx = (rx / 100) * ow; //
					var _ry = (ry / 100) * oh; //

					//this allows us to not let oval go outside bounds.
					var obj_ratiox = ((ow / 2) - _rx / 2) / (ow / 2);
					var obj_ratioy = ((oh / 2) - _ry / 2) / (oh / 2);

					var x = (((d.offsetx) / 100) * ((ow / 2) * obj_ratiox));
					var y = (((d.offsety) / 100) * ((oh / 2) * obj_ratioy));

					obj.my.x = x;
					obj.my.y = y;
					obj.my.oval_rx = _rx;
					obj.my.oval_ry = _ry;
					obj.opacity = 1;

					// obj.hasBorders = false;
					obj.my.strokeWidth = Number($('#border_image_size').val());
					obj.my.stroke = $("#border_image_colorpicker").spectrum("get").toRgbString();
					obj.my.corner_radius = Number($('#border_image_radius').val());

					obj.clipPath = null
					obj.clipPath = new fabric.Rect({
						left: -obj.width / 2,
						top: -obj.height / 2,
						width: obj.width,
						height: obj.height,
						rx: obj.my.corner_radius,
						ry: obj.my.corner_radius,
					})
				}
				else //oval
				{

					var rx = d.oval_width;
					var ry = d.oval_height;

					//scale this radius to max of object width.
					var _rx = (rx / 100) * ow; //
					var _ry = (ry / 100) * oh; // 

					//this allows us to not let oval go outside bounds.
					var obj_ratiox = ((ow / 2) - _rx / 2) / (ow / 2);
					var obj_ratioy = ((oh / 2) - _ry / 2) / (oh / 2);

					var x = (((d.offsetx) / 100) * ((ow / 2) * obj_ratiox));
					var y = (((d.offsety) / 100) * ((oh / 2) * obj_ratioy));

					obj.my.x = x;
					obj.my.y = y;
					obj.my.oval_rx = _rx;
					obj.my.oval_ry = _ry;

					obj.clipPath = null
					obj.clipPath = new fabric.Ellipse({
						left: x,
						top: y,
						rx: _rx / 2,
						ry: _ry / 2,
						angle: 0,
						originX: 'center',
						originY: 'center'
					})
				}

				if (next) //don't get into loop
				{

					// var data = {
					// 	stroke: 1,
					// 	strokeWidth: 1,
					// 	strokeDashArray: 1,
					// 	strokeLineJoin: 1,
					// 	oval_width: d.oval_width,
					// 	oval_height: d.oval_height,
					// 	radius: d.radius
					// }

					updateImageBorder(data, false);
				}
				else
					render = true;

			}
			// else //it is square
			// {
			// 	obj.clipTo = null;
			//
			// 	if (next) //don't get into loop
			// 	{
			// 		var data = {
			// 			stroke: 1,
			// 			strokeWidth: 1,
			// 			strokeDashArray: 1,
			// 			strokeLineJoin: 1,
			// 			oval_width: d.oval_width,
			// 			oval_height: d.oval_height,
			// 			radius: d.radius
			// 		}
			// 		updateImageBorder(data,false);
			// 	}
			// 	else
			// 		render = true;
			// }
		}
		else {
			obj.my.hasBorder = 'OFF';

			obj.clipTo = null;
			if (next) //don't get into loop
			{
				data = {};
				updateImageBorder(data, false);
			}
			else
				render = true;
		}

		render ? renderAfter(obj) : canvas.renderAll()
	}

	function addRoundedRect(obj) {
		var object = new fabric.Rect({
			left: obj.left,
			top: obj.top,
			width: obj.width,
			height: obj.height,
			originX: 'left',
			originY: 'top',
			stroke: '#000000',
			fill: 'transparent',
			strokeWidth: 10,
			opacity: 1
		});
		canvas.add(object);
		canvas.renderAll();
	}

	fabric.Object.drawRoundRect = function (ctx, x, y, width, height, radius, border = false) {
		var x1 = x - width / 2
		var y1 = y - height / 2
		if (border) {
			x1 = x;
			y1 = y;
		}
		ctx.beginPath();
		ctx.moveTo(x1 + radius, y1);
		ctx.lineTo(x1 + width - radius, y1);
		ctx.quadraticCurveTo(x1 + width, y1, x1 + width, y1 + radius);
		ctx.lineTo(x1 + width, y1 + height - radius);
		ctx.quadraticCurveTo(x1 + width, y1 + height, x1 + width - radius, y1 + height);
		ctx.lineTo(x1 + radius, y1 + height);
		ctx.quadraticCurveTo(x1, y1 + height, x1, y1 + height - radius);
		ctx.lineTo(x1, y1 + radius);
		ctx.quadraticCurveTo(x1, y1, x1 + radius, y1);
		ctx.closePath();
	}

	$('#canvas_div').on('click', ".exit_image_border_mode", function (e) {
		resetBorderMode();

	});

	function resetBorderMode() {
		$("#border_image_div").hide();
		$("#bottom_image_menu_div").show();
		$("#top_image_menu").css("visibility", "");
	}


	function addPicker() {
		$(".colorpicker").spectrum({
			showPalette: true,
			clickoutFiresChange: true,
			color: '#000000',
			showAlpha: true,
			palette: [
				["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
				["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
				["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
				["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
				["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
				["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
				["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
				["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
			]
		});
	}

	//////// text input	
	function addText() {
		//create and add new Textbox
		var obj = new fabric.Textbox('Start Typing', {
			fontFamily: 'Arial',
			fontSize: 20,
			left: canvas.width / 6,
			top: canvas.height / 6,
			width: 150,
			cornerSize: 20,
			fill: '#000',
			padding: 7,
			borderDashArray: [10, 5],
			hasRotatingPoint: false,
			type: 'Textbox',
			originX: 'center',
			originY: 'center',
			scaleX: globalScale,
			scaleY: globalScale,
			lockScalingY: false,
			stroke: '#000',
			strokeWidth: 0,
			fontStyle: 'normal',
			textDecoration: 'normal',
			lineHeight: 1,
			textAlign: 'left',
			itemID: itemID++,
		});

		canvas.add(obj).setActiveObject(obj);

		obj.selectAll();
		obj.enterEditing();
		obj.hiddenTextarea.focus();

		obj.stateProperties.push(
			'borderDashArray',
			'filters',
			'my'
		);

		obj.saveState();
		addedObject = true;
	}


	//Resizing	
	var globalScale; // = new BigNumber(1);

	BigNumber.config({ DECIMAL_PLACES: 15 });
	BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_HALF_UP });
	BigNumber.config({ ERRORS: false });

	var res;
	window.onresize = function () {

		if (res)
			clearTimeout(res);

		res = setTimeout(function () {
			windowResize();
		}, 100);
	};

	var baseWidth = new BigNumber(canvasWidth * numPages);
	var TO_DEC = 10;

	function windowResize() {

		var t = new BigNumber(canvas.width);
		var _t = new BigNumber($("#canvas_size").width());
		var _scaleMultiplier = new BigNumber(1);

		if (canvas.width != $("#canvas_size").width()) {
			//remove all the menus and deselect.
			$(".all_menus").remove();
			canvas.discardActiveObject();

			_scaleMultiplier = _t.div(t);

			if (globalScale) //if no global scale set.
				globalScale = Number(_scaleMultiplier.times(globalScale).toFixed(TO_DEC));	 //this keeps track of scale for adding objects.		
			else //base it off of 1160 width
			{
				if (t.lt(baseWidth)) //canvas.width < 1160
					globalScale = Number(_scaleMultiplier.times(t.div(baseWidth)).toFixed(TO_DEC));
				else
					globalScale = Number(_scaleMultiplier.times(baseWidth.div(t)).toFixed(TO_DEC));
			}

			var objects = canvas.getObjects();
			for (var i in objects) {
				objects[i].scaleX = Number(_scaleMultiplier.times(objects[i].scaleX).toFixed(TO_DEC));
				objects[i].scaleY = Number(_scaleMultiplier.times(objects[i].scaleY).toFixed(TO_DEC));
				objects[i].left = Number(_scaleMultiplier.times(objects[i].left).toFixed(TO_DEC));
				objects[i].top = Number(_scaleMultiplier.times(objects[i].top).toFixed(TO_DEC));
				objects[i].setCoords();
			}

			if (canvas.backgroundImage) {
				canvas.backgroundImage.scaleX = Number(_scaleMultiplier.times(canvas.backgroundImage.scaleX).toFixed(TO_DEC));
				canvas.backgroundImage.scaleY = Number(_scaleMultiplier.times(canvas.backgroundImage.scaleY).toFixed(TO_DEC));
			}

			var w = Number(_scaleMultiplier.times(canvas.getWidth()).toFixed(TO_DEC));
			var h = Number(_scaleMultiplier.times(canvas.getHeight()).toFixed(TO_DEC));
			canvas.setWidth(w);
			canvas.setHeight(h);
			canvas.renderAll();
			canvas.calcOffset();
			//resize the div
			$("#canvas_div").css("width", w);
			$("#canvas_div").css("height", h);


		}
		else {
			_scaleMultiplier = t.div(_t);

			if (globalScale) //if no global scale set.
				globalScale = Number(_scaleMultiplier.times(globalScale).toFixed(TO_DEC));	 //this keeps track of scale for adding objects.		
			else //base it off of 1160 width
			{
				if (t.lt(baseWidth)) //canvas.width < 1160
					globalScale = Number(_scaleMultiplier.times(t.div(baseWidth)).toFixed(TO_DEC));
				else
					globalScale = Number(_scaleMultiplier.times(baseWidth.div(t)).toFixed(TO_DEC));
			}

		}
	}

	//zoom in and out.

	$(".canvas-zoom-in, .canvas-zoom-out, .canvas-zoom-reset").click(function (e) {

		if ($(this).hasClass("canvas-zoom-in")) {
			if (localScale == 2) return false;
			pageScaleInc = .1;
			zoomCanvas();
		}
		else if ($(this).hasClass("canvas-zoom-out")) {
			if (localScale == .2) return false;
			pageScaleInc = -.1;
			zoomCanvas();
		}
		else {
			if (localScale == 1) return false;
			windowResize();
			localScale = 1;
			$(".canvas-zoom-out,.canvas-zoom-in").removeAttr("disabled");
		}

		$(".zoom_status").text("Zoom Scale: " + localScale.toFixed(1) + "x");


	});


	var pageScaleInc = 0;
	var localScale = 1;
	$(".canvas-zoom-out,.canvas-zoom-in").removeAttr("disabled");

	function zoomCanvas() {
		//remove all the menus and deselect.
		$(".all_menus").remove();
		canvas.discardActiveObject();

		var scaleMultiplier = new BigNumber(1);
		var globalScale_cur = new BigNumber(globalScale); //current global scale

		globalScale = globalScale + pageScaleInc; //new global scale
		localScale += pageScaleInc;
		if (globalScale < .20) {
			globalScale = .20;
			localScale = .20;
			$(".canvas-zoom-out").attr("disabled", true);
		}
		else
			$(".canvas-zoom-out").removeAttr("disabled");

		if (globalScale > 2) {
			globalScale = 2;
			localScale = 2;
			$(".canvas-zoom-in").attr("disabled", true);
		}
		else
			$(".canvas-zoom-in").removeAttr("disabled");

		var globalScale_new = new BigNumber(globalScale); //copy of new global scale
		scaleMultiplier = globalScale_new.div(globalScale_cur); //zoom out							

		var objects = canvas.getObjects();
		for (var i in objects) {
			objects[i].scaleX = Number(scaleMultiplier.times(objects[i].scaleX).toFixed(TO_DEC));
			objects[i].scaleY = Number(scaleMultiplier.times(objects[i].scaleY).toFixed(TO_DEC));
			objects[i].left = Number(scaleMultiplier.times(objects[i].left).toFixed(TO_DEC));
			objects[i].top = Number(scaleMultiplier.times(objects[i].top).toFixed(TO_DEC));
			objects[i].setCoords();
		}

		if (canvas.backgroundImage) {
			canvas.backgroundImage.scaleX = Number(scaleMultiplier.times(canvas.backgroundImage.scaleX).toFixed(TO_DEC));
			canvas.backgroundImage.scaleY = Number(scaleMultiplier.times(canvas.backgroundImage.scaleY).toFixed(TO_DEC));
		}

		var w = Number(scaleMultiplier.times(canvas.getWidth()).toFixed(TO_DEC));
		var h = Number(scaleMultiplier.times(canvas.getHeight()).toFixed(TO_DEC));
		canvas.setWidth(w);
		canvas.setHeight(h);
		canvas.renderAll();
		canvas.calcOffset();
		//resize the div
		$("#canvas_div").css("width", w);
		$("#canvas_div").css("height", h);

	}


	//Start - DRAG AND DROP CODE 
	var dragImg;
	var dragDiv;
	function setCanvasDrag() {
		canvas.on('mouse:move', dragMove);
		canvas.on('object:over', dragOver);
	}

	function dragMove(e) {
		if (e.target) {
			var type = e.target.get('type');
			var name = e.target.get('name');
			if (type == "Textbox" || (type == 'line' && name == 'gridLine')) //type == 'CzImage' || add this to disable replace
				e.target = null; //let it place the image just not on top of these.		
		}

		if (dragImg) {
			canvas.fire('object:over', {
				e: e
			});
		}

	};

	function dragOver(e) {
		if (!dragImg) return;
		var is_placeholder_obj = true;
		var obj = e.e.target;
		var type = $(dragImg).attr('graphic');
		if (obj) {
			var ratio = 1;  // Used for aspect ratio
			var ratiow = 1;
			var ratioh = 1;
			//if the object is not a placeholder then return
			if (obj.primarySrc.indexOf("placeholder") == -1) {
				// removeCanvasDrag();
				// dragImg = null;
				// return false;
				is_placeholder_obj = false;
			}
			if (is_placeholder_obj && type !== "clipart") {

				obj.hoverCursor = "crosshair";
				// obj.scaleX /= 2;
				// obj.scaleY /= 2;
				// var scalex = obj.scaleX;
				// var scaley = obj.scaleY;
				// // resize photo to fit on placeholder
				// obj.set('scaleX', scalex);
				// obj.set('scaleY', scaley);
				canvas.renderAll();

				var graphic = $(dragImg).attr("graphic") ? $(dragImg).attr("graphic") : null;
				var group_photo = $(dragImg).attr("group_photo") ? $(dragImg).attr("group_photo") : null;
				var im_id = $(dragImg).attr("im_id");

				//if the image is smaller then the placeholder then kill this.
				var pre = "im";
				if ($(dragImg).attr("group_photo"))
					pre = "grp";
				else if ($(dragImg).attr("graphic"))
					pre = "gr";

				var nw = (document.getElementById(pre + "_" + im_id).naturalWidth);
				// var nw = (document.getElementById(pre+"_"+im_id).width);
				var nh = (document.getElementById(pre + "_" + im_id).naturalHeight);
				// var nh = (document.getElementById(pre+"_"+im_id).height);
				var bound = obj.getBoundingRect();
				console.log(nw, nh);
				// if(obj.my.corner_radius) {
				// 	obj.my.corner_radius /= 2;
				// }
				var width = obj.width;
				var height = obj.height;
				console.log('getroundingrect width, height', width, height, globalScale);

				// if (nw < width && nh < height)
				// {
				//     removeCanvasDrag();
				//     dragImg = null;
				//     alert('The image you are trying to add is too small. Please choose a larger image or resize the placeholder.');
				//     return false;
				// }

				ratiow = width / nw;
				ratioh = height / nh;
				ratio = Math.max(ratiow, ratioh);
				// var left = obj.left + width / 2 - height * nw / (nh * 2);
				var left = ratiow <= ratioh ? obj.left + width / 2 - height * nw / (nh * 2) : obj.left;
				var top = ratiow > ratioh ? obj.top + height / 2 - width * nh / (nw * 2) : obj.top;
				// left = obj.left;
				// top = obj.top;
				// var opts = { x:obj.left, y:obj.top, scalex:ratio, scaley:ratio, scale:globalScale, replaced:true, imageID:im_id, graphic:graphic, evented:true, group_photo:group_photo, opacity:0 };
				// var opts = { x:left, y:obj.top, scalex:ratio, scaley:ratio, scale:globalScale, replaced:true, imageID:im_id, graphic:graphic, evented:true, group_photo:group_photo, opacity:0 };
				var opts = { x: left, y: top, scalex: ratio, scaley: ratio, scale: globalScale, replaced: true, imageID: im_id, graphic: graphic, evented: true, group_photo: group_photo, opacity: 0 };
				var plc_obj = obj; //copy the object
				if (plc_obj.width == plc_obj.height) {
					plc_obj.width -= 1;
				}

				canvas.remove(obj); //remove placeholder
				zc.init(dragImg.src, opts, plc_obj);
				// canvas.renderAll();

			}
		}
		if (!obj || !is_placeholder_obj || type === "clipart") {
			var pointer = canvas.getPointer(e.e.e);
			var graphic = $(dragImg).attr("graphic") ? $(dragImg).attr("graphic") : null;
			var group_photo = $(dragImg).attr("group_photo") ? $(dragImg).attr("group_photo") : null;
			var im_id = $(dragImg).attr("im_id");

			var opts = { x: pointer.x, y: pointer.y, scalex: 1, scaley: 1, scale: globalScale, imageID: im_id, graphic: graphic, evented: true, group_photo: group_photo };
			zc.init(dragImg.src, opts);
		}

		// if (is_placeholder_obj || )
		removeCanvasDrag();
		dragImg = null;
		dirty = true;
		addedObject = true;
		draggedAdded = true;

	};

	var addedObject = removedObject = draggedAdded = croppedObject = false;

	function removeCanvasDrag() {
		canvas.off('object:over', dragOver);
		canvas.off('mouse:move', dragMove);
	}

	function setDrag(div) {
		$(div + " .check_mark").mousedown(function () {
			return false;
		});

		function handleDragStart(e) {
			//dragDiv

			//remove all the menus and deselect.
			$(".all_menus").remove();
			canvas.discardActiveObject();
			setCanvasDrag();
			$('.item').removeClass('img_dragging');
			$(this).addClass('img_dragging');
		}

		function handleDragOver(e) {
			e = e || event;
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
			return false;
		}

		function handleDragEnter(e) {
			this.classList.add('over');
		}

		function handleDragLeave(e) {
			this.classList.remove('over'); // this / e.target is previous target element.
			removeCanvasDrag();
		}

		function handleDrop(e) {
			e = e || event;
			e.preventDefault();
			dragImg = document.querySelector(div + ' img.img_dragging');
			return false;
		}

		function handleDragEnd(e) {
			$(".item").removeClass('img_dragging');
		}

		// Bind the event listeners for the image elements
		var images = document.querySelectorAll(div + ' img');
		$.each(images, function (key, value) {
			if ($(this).hasClass("check_mark")) return true;
			this.addEventListener('dragstart', handleDragStart, false);
			this.addEventListener('dragend', handleDragEnd, false);
		});

		// Bind the event listeners for the canvas
		var canvasContainer = document.getElementById('canvas_div');
		canvasContainer.addEventListener('dragenter', handleDragEnter, false);
		canvasContainer.addEventListener('dragover', handleDragOver, false);
		canvasContainer.addEventListener('dragleave', handleDragLeave, false);
		canvasContainer.addEventListener('drop', handleDrop, false);

	}



	var bld = [];
	var ticks = [];

	function removeTicks() {

		if (ticks.length !== 0) //tick exists.
		{
			$.each(ticks, function (i, v) {
				canvas.remove(v);
			});

			ticks = [];
		}
		else //loaded json back in and no ticks.
		{
			var objs = canvas.getObjects();
			$(objs).reverse().each(function (i, v) {
				if (v.type == 'line' && v.name == 'tick')
					canvas.remove(v);
			});

		}
	}

	function addTicks() {

		function makeTickLine(coords, color) {
			return new fabric.Line(coords, {
				stroke: color,
				strokeWidth: 2,
				selectable: false,
				name: 'tick',
				bottom: true
			});
		}

		//tl
		ticks[0] = makeTickLine([trim, 0, trim, bleed], 'black');
		ticks[1] = makeTickLine([0, trim, bleed, trim], 'black');
		//tr
		ticks[2] = makeTickLine([canvas.width - trim, 0, canvas.width - trim, bleed], 'black');
		ticks[3] = makeTickLine([canvas.width, trim, canvas.width - bleed, trim], 'black');
		//br
		ticks[4] = makeTickLine([canvas.width - trim, canvas.height, canvas.width - trim, canvas.height - bleed], 'black');
		ticks[5] = makeTickLine([canvas.width, canvas.height - trim, canvas.width - bleed, canvas.height - trim], 'black');
		//bl
		ticks[6] = makeTickLine([trim, canvas.height, trim, canvas.height - bleed], 'black');
		ticks[7] = makeTickLine([0, canvas.height - trim, bleed, canvas.height - trim], 'black');

		$.each(ticks, function (i, v) {
			canvas.insertAt(ticks[i], i);
		});
	}

	function removeBleed() {
		$.each(bld, function (i, v) {
			canvas.remove(v);
		});
		bld = [];
	}

	function addBleed() {
		safe1 = safe * globalScale;
		trim1 = trim * globalScale;
		bleed1 = bleed * globalScale;
		gutter1 = gutter * globalScale;

		function makeLine(coords, color) {
			return new fabric.Line(coords, {
				stroke: color,
				strokeWidth: 1,
				selectable: false,
				strokeDashArray: [5, 5],
				bottom: true
			});
		}

		//safe
		if (numPages == 1) {
			bld.push(makeLine([safe1, safe1, canvas.width - safe1, safe1], 'green'));
			bld.push(makeLine([canvas.width - safe1, safe1, canvas.width - safe1, canvas.height - safe1], 'green'));
			bld.push(makeLine([canvas.width - safe1, canvas.height - safe1, safe1, canvas.height - safe1], 'green'));
			bld.push(makeLine([safe1, canvas.height - safe1, safe1, safe1], 'green'));
		}
		else {
			bld.push(makeLine([safe1, safe1, canvas.width / 2 - gutter1, safe1], 'green'));
			bld.push(makeLine([canvas.width / 2 - gutter1, safe1, canvas.width / 2 - gutter1, canvas.height - safe1], 'green'));
			bld.push(makeLine([canvas.width / 2 - gutter1, canvas.height - safe1, safe1, canvas.height - safe1], 'green'));
			bld.push(makeLine([safe1, canvas.height - safe1, safe1, safe1], 'green'));

			bld.push(makeLine([canvas.width / 2 + gutter1, safe1, canvas.width - safe1, safe1], 'green'));
			bld.push(makeLine([canvas.width - safe1, safe1, canvas.width - safe1, canvas.height - safe1], 'green'));
			bld.push(makeLine([canvas.width - safe1, canvas.height - safe1, canvas.width / 2 + gutter1, canvas.height - safe1], 'green'));
			bld.push(makeLine([canvas.width / 2 + gutter1, safe1, canvas.width / 2 + gutter1, canvas.height - safe1], 'green'));
		}
		// trim
		bld.push(makeLine([trim1, trim1, canvas.width - trim1, trim1], 'blue'));
		bld.push(makeLine([canvas.width - trim1, trim1, canvas.width - trim1, canvas.height - trim1], 'blue'));
		bld.push(makeLine([canvas.width - trim1, canvas.height - trim1, trim1, canvas.height - trim1], 'blue'));
		bld.push(makeLine([trim1, canvas.height - trim1, trim1, trim1], 'blue'));

		//bleed
		bld.push(makeLine([bleed1, bleed1, canvas.width - bleed1, bleed1], 'red'));
		bld.push(makeLine([canvas.width - bleed1, bleed1, canvas.width - bleed1, canvas.height - bleed1], 'red'));
		bld.push(makeLine([canvas.width - bleed1, canvas.height - bleed1, bleed1, canvas.height - bleed1], 'red'));
		bld.push(makeLine([bleed1, canvas.height - bleed1, bleed1, bleed1], 'red'));

		if (numPages == 2) {
			bld.push(makeLine([canvas.width / 2, 0, canvas.width / 2, canvas.height], 'black'));
		}

		$.each(bld, function (i, v) {
			//canvas.insertAt(v, i);
			canvas.add(v);
		});

	}

	$("#add_photos").click(function (e) {

		if ($("#photos_div").is(":visible"))
			return false;

		$("#photo_message").html('');
		$("#photos_folder").prop('selectedIndex', 0);
		getClientImages(thisPage);

	});

	$("#photos_folder").change(function (e) {
		reset_drag_img('photos');
		$(".image").remove();
		$("#thumbs").width('');

		var page = $(this).val();
		$("#photo_message").html('');
		if ($.isNumeric(page))
			getClientImages(page);
		else
			getClientGroupImages(page);


	});

	function getClientGroupImages(page) {

		thumb_div_width = 0;

		var _this = $(this);
		$.ajax({
			url: base_url + 'red/yrb_pges/gt_grp_ajax',
			data: "page=" + page, //this is not used really just checked to make sure its here.
			type: "POST",
			dataType: 'json',
			success: function (data) {

				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				if (data) {
					//remove the photos and show new.
					$(".image").remove();

					//if found photos then show
					if (data[0].id) {
						$("#photos_div").show();

						var curIds = [];

						//grab all image id's on the canvas.
						canvas.forEachObject(function (obj) {
							if (obj.type === 'CzImage' && obj.group_photo)
								curIds.push(obj.imageID);
						});

						$("#thumbs").css("height", "140px");
						$.each(data, function (key, val) {
							addThumbGroup(val, curIds);
						});

						setDrag("#thumbs");
					}
				}
				else
					$("#photo_message").html('No group photos were found.');

			}
		});
	}


	//add new thumb
	function addThumbGroup(data, curIds) {

		var image = data.image.split("/")[1];

		//return false;

		//look if image exists on canvas.
		var found = $.inArray(data.id, curIds) != -1 ? true : false;
		var this_page = thisPage.toString();
		var found_other = false;

		//check if used elsewhere
		if (data.used_pages != null) {
			var t = data.used_pages.split(",");
			if (t.length > 0) {
				$.each(t, function (i, v) {
					if (v != this_page) //must be from other page
					{
						found_other = true;
						return false;
					}
				});
			}
		}

		var grade_division_onphoto = data.grade_division_onphoto ? data.grade_division_onphoto : "&nbsp;";
		var name = image + "<br>" + grade_division_onphoto;
		if (data.is_roster_associated)
			name = data.is_roster_associated + "<br>" + grade_division_onphoto;
		if (data.teachergroup_name_onphoto)
			name = data.teachergroup_name_onphoto + "<br>" + grade_division_onphoto;

		var html = '';
		html += '<div class="list_image image group_thumb" title="" image_id="' + data.id + '" style="max-height:140px;">';
		html += '	<div id="img_div">';
		html += '		<img title="' + name + '" draggable="true" group_photo="group" im_id="' + data.id + '" id="grp_' + data.id + '" class="item" src="' + img_path + 'indicator_big.gif" height="100" >';
		if (found && !found_other)
			html += '	<div title="Image Used" id="used_grp_' + data.id + '" style="position:absolute;bottom:30px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
		else if (found_other && data.used_pages != null)
			html += '	<div title="Image Used On Other Pages" id="used_grp_' + data.id + '" style="position:absolute;bottom:30px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'yellow_check_circle.png"></div>';
		html += '	</div>';
		html += '	<div style="font-size:12px;" >' + name + '</div>';
		html += '</div>';

		$("#thumbs").append(html);
		//recalculate div width
		var img1 = new Image();
		img1.id = data.id;
		img1.onload = function () {

			$("#grp_" + this.id).attr("src", this.src.replace(/^.*\/\/[^\/]+/, ''));

			setTimeout(function () {
				var imge_width = $('.group_thumb[image_id="' + img1.id + '"]').width();
				//var cur_thumb_width = $("#thumbs").width();
				thumb_div_width += (imge_width + 150);
				//if (cur_thumb_width < thumb_div_width)
				$("#thumbs").css("width", thumb_div_width);
			}, 500);

		}
		img1.src = "/red/yrb_pges/get_group_thmb/" + data.image;


		$('.list_image.image').on('click', function (e) {
			$('.list_image.clipart_thumb').removeClass('active');
			var list_images = $('.list_image.image');
			for (var i = 0; i < list_images.length; i++) {
				if ($(list_images[i]).attr('image_id') != $(this).attr('image_id')) {
					$(list_images[i]).removeClass('active');
				}
			}
			$(this).addClass('active');
			dragImg = this.querySelector('img');
		});
	}



	//get thumbs
	var thumb_div_width = 0;
	var bgs_div_width = 0;

	function getClientImages(page) {

		var term = '';
		thumb_div_width = 0;

		var _this = $(this);

		if (is_com_user_page())
			req = '/red/upload_ph/srch_pge_com_ajax';
		else if (is_client_page())
			req = '/red/upload_ph/srch_pge_ajax';

		$.ajax({
			url: req,
			data: "page=" + page + "&term=" + term,
			type: "POST",
			dataType: 'json',
			success: function (data) {

				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				$("#photos_div").show();

				if (data) {
					//remove the photos and show new.
					$(".image").remove();


					//if found photos then show
					if (data[0].id) {
						var curIds = [];

						//grab all image id's on the canvas.
						canvas.forEachObject(function (obj) {
							if (obj.type === 'CzImage' && !obj.group_photo && !obj.graphic)
								curIds.push(obj.imageID);
						});

						$("#thumbs").css("height", "110px");
						$.each(data, function (key, val) {
							addThumb(val, false, curIds);
						});

						setDrag("#thumbs");
					}
				}
				else
					$("#photo_message").html('No photos were found.');
				//$("#photos_div").show();
				//alert('It appears there are no photos uploaded for this page yet, or there was a problem retrieving them.');																							
			}
		});
	}

	//add new thumb
	function addThumb(data, upload, curIds) {

		var client_class = '';

		if (!upload) {
			data.image = data.image.split("|")[1];
			if (data.uploaded_by.indexOf("@") >= 0)
				client_class = 'client_border';
		}

		//look if image exists on canvas.
		var found = $.inArray(data.id, curIds) != -1 ? true : false;
		var this_page = thisPage.toString();
		var found_general = false;
		var found_other_general = false;
		//check if general folder
		if (data.page == 1000) {
			var t = data.used_pages.split("|");
			if (t.length > 0) {
				$.each(t, function (i, v) {
					if (v != this_page) //must be from other page
					{
						found_other_general = true;
						return false;
					}
				});
			}
		}
		///////////////////// thumbs rendering ////////////
		var html = '';
		html += '<div class="list_image image ' + client_class + '" title="" image_id="' + data.id + '">';
		html += '	<div id="img_div">';
		html += '		<img title="' + data.o_image_name + '" draggable="true" im_id="' + data.id + '" id="im_' + data.id + '" class="item" src="' + img_path + 'indicator_big.gif" height="100" >';
		if (found && !found_other_general)
			html += '	<div title="Image Used" id="used_im_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
		else if (found_other_general && data.used_pages != "")
			html += '	<div title="Image Used On Other Pages" id="used_im_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'yellow_check_circle.png"></div>';
		html += '	</div>';

		html += '</div>';

		$("#thumbs").append(html);
		//recalculate div width
		var img1 = new Image();
		img1.id = data.id;
		img1.onload = function () {

			$("#im_" + this.id).attr("src", this.src.replace(/^.*\/\/[^\/]+/, ''));
			var imge_width = $('#im_' + this.id).width();
			var cur_thumb_width = $("#thumbs").width();
			thumb_div_width += (imge_width + 15);
			if (cur_thumb_width < thumb_div_width)
				$("#thumbs").css("width", thumb_div_width);

		}
		if (is_com_user_page())
			img1.src = "/red/get_med_com/" + data.image;
		else
			img1.src = "/red/get_med/" + data.image;

		$('.list_image.image').on('click', function (e) {
			$('.list_image.clipart_thumb').removeClass('active');
			var list_images = $('.list_image.image');
			for (var i = 0; i < list_images.length; i++) {
				if ($(list_images[i]).attr('image_id') != $(this).attr('image_id')) {
					$(list_images[i]).removeClass('active');
				}
			}
			$(this).addClass('active');
			dragImg = this.querySelector('img');
		});
	}

	$('.panel').on('click', ".close_option", function (e) {
		var panel = $(this).attr("pnl");
		$("#" + panel).hide();
		if (panel == "background_div") {
			$(".background_thumb").remove();
			$("#background_thumbs").width('');
		}
		else if (panel == "photos_div") {
			$(".image").remove();
			$("#thumbs").width('');
		}
		else if (panel == "restore_div") {
			$(".restore_thumb").remove();
			$("#restore_thumbs").width('');
		}
	});

	var canvas_customProperties = 'globalScale grid_showing grid snap_grid template'.split(' ');

	$("#save").click(function (e) {
		//disable the save button.
		$("#save").attr("disabled", true);
		dirty = false;
		$('div.progress > div.progress-bar').css("width", "0%");
		$("#load_status_div").show();

		//delay to let screen update
		littleDelay('saveData', 300, []);

		document.body.style.cursor = 'wait';
	});


	//general function to create delay then call a function. why not.
	function littleDelay(f, timeOut, params) {
		setTimeout(function () {
			window[f].apply(this, params);
		}, timeOut);

	}

	saveData = function () {
		$(".all_menus").remove();
		canvas.discardActiveObject();

		removeBleed();
		removeGrid();

		canvas.globalScale = globalScale;
		canvas.grid_showing = grid_showing;
		canvas.grid = grid;
		canvas.snap_grid = snap_grid;
		if (!is_staff_page()) {
			canvas.template = thisTemplate;
		}
		//get thumbnail based on trim lines.		

		// cropped png dataURL
		var list_thumbnail_width = 200;
		var thumb_scale = list_thumbnail_width / ((1 / globalScale) * (canvas.width - trim));

		var page_thumbnail = canvas.toDataURL({
			format: 'png',
			left: trim,
			top: trim,
			width: canvas.width - (trim * 2),
			height: canvas.height - (trim * 2),
			quality: 1,
			multiplier: thumb_scale * 4 //need larger size to get quality. Rescale it in PHP after upload.			
		});

		var _data = canvas.toDatalessJSON(canvas_customProperties);

		// set text information
		const detailData = canvas.getObjects()
		for (var i = 0; i < _data.objects.length; i++) {
			if (_data.objects[i].type == 'Textbox') {
				_data.objects[i].text = detailData[i].text
				_data.objects[i].fontSize = detailData[i].fontSize
				_data.objects[i].fontFamily = detailData[i].fontFamily
			}
		}

		function replacer(name, val) {

			// convert RegExp to string
			if (name == "fontFamily")
				return val.replace(/"/g, "");
			else
				return val; // return as is
		};

		if (_data.backgroundImage) {
			if (_data.backgroundImage.src.indexOf('http') === 0) {
				_data.backgroundImage.src = new URL(_data.backgroundImage.src).pathname
			}
		}

		if (_data.objects) {
			$.each(_data.objects, function (k, v) {
				if (v.primarySrc && v.primarySrc.indexOf('http') === 0) {
					v.primarySrc = new URL(v.primarySrc).pathname;
				}
				if (v.src && v.src.indexOf('http') === 0) {
					v.src = new URL(v.src).pathname;
				}
			});
		}
		var data = null;
		if (is_staff_page()) {
			data =
			{
				page_json_data: JSON.stringify(_data, replacer),
				page_thumbnail: page_thumbnail,
				id: thisTemplate
			};
		} else {
			data =
			{
				page: thisPage,
				page_json_data: JSON.stringify(_data, replacer),
				page_thumbnail: page_thumbnail,
				new_template: page_template_id ? 1 : 0,
				page_template_id: thisTemplate
			};
		}

		//now clear thenew template variable.
		page_template_id = 0;

		if (is_com_user_page())
			req = '/red/yrb_pges/sve_com_ajax';
		else if (is_client_page())
			req = '/red/yrb_pges/sve_ajax';
		else if (is_staff_page())
			req = '/templates/saveTemplate_ajax';

		$.ajax({
			url: req,
			data: data,
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				if (data) {
					$("#load_status_div").delay(5000).fadeOut(1000);
				}
				else
					alert('There was a problem saving. Please try again.');
				addBleed();

				if (grid_showing)
					addGrid();

				$("#load_status_div").hide();
				autoSaving = false;
				//clear the timer
				clearInterval(autoSaveTimer);
				autoSave(); // restart auto save timer

				//enable the save button.
				$("#save").removeAttr("disabled");
				document.body.style.cursor = 'default';

				if (is_com_user_page()) {
					if (goUpload) {
						window.open(base_url + 'red/upload_ph/mng_pge_com/' + thisPage, '_self');
					}
				}
			},
			xhr: function () {
				var xhr = new window.XMLHttpRequest();
				//Upload Progress
				xhr.upload.addEventListener("progress", function (evt) {
					if (evt.lengthComputable) {
						var percentComplete = (evt.loaded / evt.total) * 100;
						$('div.progress > div.progress-bar').css({
							"width": percentComplete + "%"
						});
						if (autoSaving)
							$("#load_status").html("Autosaving: " + Math.floor(percentComplete) + "% Complete");
						else
							$("#load_status").html(Math.floor(percentComplete) + "% Complete");
					}
				}, false);
				return xhr;
			}
		});

	}

	var webfontsloaded = false;
	function loadFonts() {

		var default_fonts = ['Arial', 'Calibri', 'Courier New', 'Myriad Pro', 'Delicious', 'Verdana', 'Georgia', 'Courier', 'Comic Sans MS', 'Impact', 'Monaco'];

		if (fonts.length > 0) {
			default_fonts.push('Navajo:n4,i4,n7,i7');
			WebFont.load({
				google: {
					families: fonts
				},
				classes: false,
				active: function () {
					webfontsloaded = true; //done loading then we can load the page.
				},
				custom: {
					families: default_fonts
				}

			});
		}
		else {
			WebFont.load({ //only load the local fonts.
				custom: {
					families: default_fonts
				},
				classes: false,
				active: function () {
					webfontsloaded = true; //done loading then we can load the page.
				}
			});

		}

	}

	function showTextBoxes() {
		canvas.forEachObject(function (obj) {
			if (obj.type == "Textbox") {
				obj.set('dirty', true)
				obj.visible = true
			}
		})
	}

	function loadCanvas() {
		//$("#loading").show();
		if (is_com_user_page()) {
			req = '/red/yrb_pges/ld_pge_com_ajax';
			// data = "p="+thisPage+"&page_template_id="+page_template_id;
			data = { "p": thisPage, "page_template_id": page_template_id };
		}
		else if (is_client_page()) {
			req = '/red/yrb_pges/ld_pge_ajax';
			// data = "p="+thisPage+"&page_template_id="+page_template_id;
			data = { "p": thisPage, "page_template_id": page_template_id };
		}
		else if (is_staff_page()) {
			req = '/templates/loadEditTemplate_ajax';
			// data = "id="+thisTemplate;
			data = { "id": thisTemplate };
			var new_canvas = '{"objects":[],"background":"","globalScale":1,"grid_showing":true,"grid":"30","snap_grid":true}';
		}


		$.ajax({
			url: req,
			data: data,
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.
				if (data) {
					if (is_staff_page()) {
						var title = "Template: " + data.template_name;
						$("#template_title").text(title);
					}
					loadFonts();
					if (is_staff_page()) {
						if (!data.template_json_data) {
							data.template_json_data = new_canvas;
						}
					}
					if (is_client_page() || is_com_user_page()) {
						var t = $.parseJSON(data);
					}
					else if (is_staff_page()) {
						var t = $.parseJSON(data.template_json_data);
					}
					var s = new BigNumber(t.globalScale); //get the saved globalScale.
					var _scaleMultiplier = new BigNumber(1); //the scaleMultiplier to bump up or down the loaded objects.
					var _globalScale = new BigNumber(globalScale);

					_scaleMultiplier = _globalScale.div(s);
					//now scale all the objects in the data.
					if (!_scaleMultiplier.equals(1)) {
						$.each(t.objects, function (k, v) {
							v.scaleX = _scaleMultiplier.times(v.scaleX).toNumber();
							v.scaleY = _scaleMultiplier.times(v.scaleY).toNumber();
							v.left = _scaleMultiplier.times(v.left).toNumber();
							v.top = _scaleMultiplier.times(v.top).toNumber();
						});
					}
					if (t.backgroundImage) {
						t.backgroundImage.scaleX = _scaleMultiplier.times(t.backgroundImage.scaleX);
						t.backgroundImage.scaleY = _scaleMultiplier.times(t.backgroundImage.scaleY);
						if (t.backgroundImage.src && t.backgroundImage.src.indexOf('http') === 0) {
							t.backgroundImage.src = new URL(t.backgroundImage.src).pathname;
						}
					}
					$.each(t.objects, function (k, v) {
						if (v.primarySrc && v.primarySrc.indexOf('http') === 0) {
							v.primarySrc = new URL(v.primarySrc).pathname;
						}
						if (v.src && v.src.indexOf('http') === 0) {
							v.src = new URL(v.src).pathname;
						}
					});

					//make sure the lockscale are false.
					$.each(t.objects, function (k, obj) {
						if (obj.type == "Textbox") obj.visible = false

						if (obj._controlsVisibility) {
							obj._controlsVisibility.br = obj._controlsVisibility.bl = true;
							obj._controlsVisibility.mtr = false;
						}

						obj.lockMovementX = obj.lockMovementY = obj.lockScalingX = obj.lockScalingY = obj.lockRotation = false;

						if (!obj.my) {
							obj.stroke = 'rgb(0, 0, 0)';
						}

						if (!obj.hasBorders) {
							obj.hasBorders = true
						}

						if (obj.my && obj.my.stroke == "") {
							obj.my.stroke = 'rgb(0, 0, 0)';
							obj.stroke = 'rgb(0, 0, 0)';
						}

						if (obj.filters && obj.filters.length > 0) {
							obj.tempFilters = obj.filters
							obj.filters = []
						}

						if (obj.my && obj.my.frame_style) {
							obj.clipPath = null
							if (obj.my.frame_style == "round") {
								obj.clipPath = new fabric.Circle({
									top: obj.my.y,
									left: obj.my.x,
									radius: obj.my.circle_radius,
									startAngle: 0,
									angle: Math.PI * 2,
									originX: "center",
									originY: "center"
								})
							} else if (obj.my.frame_style == "oval") {
								obj.clipPath = new fabric.Ellipse({
									left: obj.my.x,
									top: obj.my.y,
									rx: obj.my.oval_rx / 2,
									ry: obj.my.oval_ry / 2,
									angle: 0,
									originX: 'center',
									originY: 'center'
								})
							} else if (obj.my.frame_style == "square") {
								obj.clipPath = new fabric.Rect({
									left: -obj.width / 2,
									top: -obj.height / 2,
									width: obj.width,
									height: obj.height,
									rx: obj.my.corner_radius,
									ry: obj.my.corner_radius,
								})
							}
						}

					});

					canvas.loadFromJSON(t, function () {
						applyImageBorders();
						setTimeout(function () {
							showTextBoxes();
							applyImageFilters();
							applyStateProperties();
							ticks = [];
							removeTicks();
							addBleed();
							setGridValues(t);
							$("#loading").hide();
							if (is_com_user_page() || is_client_page()) {
								if (!page_template_id) //if we we did not just load a new template .
									thisTemplate = t.template ? t.template : 0;
							}
						}, 300);
					})
				}
				else {
					addBleed();
					setGridValues(false);
					//canvas.renderAll();
					$("#loading").hide();
					//$("#save").trigger("click");
				}

				autoSave();
				$(".undo_div").show();
			}
		});
	}

	//my will hold our custom properties.
	fabric.Object.prototype.toObject = (function (toObject) {
		return function () {
			return fabric.util.object.extend(toObject.call(this), {
				my: this.my,
				borderDashArray: this.borderDashArray,
				padding: this.padding,
				_controlsVisibility: this._controlsVisibility,
				hasRotatingPoint: this.hasRotatingPoint,
				hasBorders: this.hasBorders,
				lockScalingY: this.lockScalingY,
				cornerSize: this.cornerSize,
				frame_round_border: this.frame_round_border,
				name: this.name,
				imageID: this.imageID,
				graphic: this.graphic,
				panel: this.panel
			});
		};
	})(fabric.Object.prototype.toObject);


	//grid code
	var grid = 20;
	var grid_size = 0;
	var grid_showing = false, snap_grid = false;

	function addGrid() {
		var grid_width = $("#c").width();
		var grid_height = $("#c").height();

		var vLine, hLine;
		safe1 = safe * globalScale;
		grid_size = grid * globalScale;

		for (var i = 1; i < ((grid_width - 2 * safe1) / grid_size); i++) {
			vLine = new fabric.Line([(i * grid_size) + safe1, 0 + safe1, (i * grid_size) + safe1, grid_height - safe1], { stroke: '#ccc', selectable: false, name: 'gridLine', bottom: true });
			canvas.add(vLine);
			canvas.sendToBack(vLine);
		}

		for (var i = 1; i < ((grid_height - 2 * safe1) / grid_size); i++) {
			hLine = new fabric.Line([0 + safe1, (i * grid_size) + safe1, grid_width - safe1, (i * grid_size) + safe1], { stroke: '#ccc', selectable: false, name: 'gridLine', bottom: true });
			canvas.add(hLine);
			canvas.sendToBack(hLine);
		}

		grid_showing = true;
		setBorderBack();
	}

	//sendToBack

	function removeGrid() {
		var objs = canvas.getObjects();
		$(objs).reverse().each(function (i, v) {
			if (v.type == 'line' && v.name == 'gridLine')
				canvas.remove(v);
		});

	}

	$('.nav').on('click', "#change_grid", function (e) {
		e.preventDefault();

		if ($("#grid_settings_div").is(":visible"))
			return true;

		$("#grid_settings_div").show();

	});

	$('#grid_settings_div').on('click', "#update_grid", function (e) {
		updateGrid();
	});

	$('#grid_settings_div').on('change', "#show_grid", function (e) {
		if ($(this).val() == "NO")
			$("#grid_options_div").hide();
		else
			$("#grid_options_div").show();
	});

	function setGridValues(obj) {
		if (!obj) //new page so no grid data.
		{
			$("#show_grid").val("YES");
			$("#grid_spacing").val("10");
			grid = 10;
			$("#snap_grid").val("YES");
			snap_grid = true;
			$("#show_grid").trigger("change");
			addGrid();
		}
		else {
			$("#show_grid").val(obj.grid_showing == true ? "YES" : "NO");
			$("#grid_spacing").val(obj.grid);
			grid = obj.grid;
			$("#snap_grid").val(obj.snap_grid == true ? "YES" : "NO");
			snap_grid = obj.snap_grid;
			$("#show_grid").trigger("change");
			if (obj.grid_showing)
				addGrid();
		}
	}

	function updateGrid() {
		$("#update_grid").before('<span id="grid_loading_gif"><i style="font-size: 1.5em;" class="fa fa-spinner fa-pulse fa-fw"></i></span>');

		setTimeout(function () //give a moment to load spinner
		{

			if ($("#show_grid").val() == "NO") {
				removeGrid();
				grid_showing = false;
				$("#grid_loading_gif").remove();
			}
			else {
				//if grid spacing same then dont mess with grid.
				if (grid != $("#grid_spacing").val() || !grid_showing) {
					removeGrid();
					grid = $("#grid_spacing").val();
					addGrid();
					grid_showing = true;
				}
				$("#grid_loading_gif").remove();
			}
			snap_grid = $("#snap_grid").val() == "YES" ? true : false;

		}, 20);

		dirty = true;
		//saveState();	

	}

	if (is_com_user_page()) {
		// go to upload
		var goUpload = false;
	}
	//autosave
	var autoSaving = false;
	var autoSaveTimer;
	//autosave if changes made every 5 minutes.
	function autoSave() {
		autoSaveTimer = setInterval(function () //give a moment to load spinner
		{
			autoSaving = true;
			if (dirty) //something changed.
				$("#save").trigger("click");
			else
				autoSaving = false;

		}, 300000);

	}


	//lock page update.	
	function saveLockPage() {

		if (is_com_user_page()) {
			req = '/red/yrb_pges/pg_lk_com_ajax';
			// data = "p="+thisPage
			data = { "p": thisPage }
		}
		else if (is_client_page()) {
			req = '/red/yrb_pges/pg_lk_ajax';
			data = { "p": thisPage }
		}
		else if (is_staff_page()) {
			req = '/red/yrb_pges/pg_lk_ajax';
			//data = "p="+thisTemplate;
			data = { "p": thisTemplate };
		}

		$.ajax({
			url: req,
			data: data,
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				if (!data)
					alert('We could not update your page status. Please save and then reload this page. Thank You.');
			}
		});
	}


	//Lock Page Timer
	var savePageLockTimer = setInterval(function () //give a moment to load spinner
	{
		saveLockPage();
	}, 60000);


	//prevent close if not saved.
	$(window).bind('beforeunload', function () {
		return 'Did you save your work? Any changes will be lost.';
	});


	windowResize();	//this just gets the scale.

	//undo-redo	
	var current;
	var list = [];
	var state = [];
	var index = 0;
	var redo_undo_action = false;
	var lastObj, clipPathObj = [], indexState = [], objectAddDelete = [];

	function saveState() {
		var obj = canvas.getActiveObject();
		if (obj) {
			if (index == 0 && list.length == 0) //save start state and current state
			{
				list = [];
				state = [];
				clipPathObj = [];
				indexState = [];
				objectAddDelete = [];

				movedItems = [];

				//if not dragging	
				if (!draggedAdded) {
					state[index] = JSON.stringify(obj._stateProperties);
					list[index] = obj;
					clipPathObj[index] = obj.clipPath;
					updateSendObject(index, obj);
					objectAddDelete[index] = null;
					index++;
				}
				else
					draggedAdded = false;


				obj.saveState();

				//save first state
				state[index] = JSON.stringify(obj._stateProperties);
				list[index] = obj;
				clipPathObj[index] = obj.clipPath;
				updateSendObject(index, obj);
				updateAddDeleteObject(index, obj);


				movedItems.push(obj.itemID);

				lastObj = $.extend(true, {}, obj);

			}
			else {
				//if index is less than highest then remove undo or redo happened 
				// we are adding now so need to dump any saved higher than this.
				if (index < list.length - 1) {
					//remove now greater than index.
					var q = 0;
					for (var i = list.length - 1; i > 0; --i) {
						if (i > index || (i == index && list[i - 1].itemID != list[index].itemID)) {
							list.splice(i, 1);
							state.splice(i, 1);
							clipPathObj.splice(i, 1);
							indexState.splice(i, 1);
							objectAddDelete.splice(i, 1);
							q++;
						}
					}

					//rebuild movedItems
					movedItems = [];
					$.each(list, function (i, v) {
						if ($.inArray(v.itemID, movedItems) == -1) //is this item there already? 
							movedItems.push(v.itemID);
					});

					lastObj = obj; //reset this now.
					if (index > list.length - 1) //check if index needs to change
						index = list.length - 1;
				}


				if ($.inArray(obj.itemID, movedItems) == -1) //this object has never been moved.
				{

					index++;
					//save first state
					state[index] = JSON.stringify(obj._stateProperties);
					list[index] = obj;
					clipPathObj[index] = obj.clipPath;
					updateSendObject(index, obj);
					updateAddDeleteObject(index, obj);

					index++;

					obj.saveState();

					//don't incremement this time.
					state[index] = JSON.stringify(obj._stateProperties);
					list[index] = obj;
					clipPathObj[index] = obj.clipPath;
					updateAddDeleteObject(index, obj);
					updateSendObject(index, obj);

					movedItems.push(obj.itemID);

				}
				else {
					//if this object not same as last then save its state first.
					if (obj.itemID != lastObj.itemID) {
						//save first state
						index++;

						state[index] = JSON.stringify(obj._stateProperties);
						list[index] = obj;
						clipPathObj[index] = obj.clipPath;
						updateAddDeleteObject(index, obj);
						updateSendObject(index, obj);
					}

					obj.saveState();

					index++;

					//save the previous state
					state[index] = JSON.stringify(obj._stateProperties);
					list[index] = obj;
					clipPathObj[index] = obj.clipPath;
					updateAddDeleteObject(index, obj);
					updateSendObject(index, obj);
				}

				lastObj = $.extend(true, {}, obj);
			}
		}
		else if (removedObject)//if null then it must have been deleted.
		{
			var _obj = theRemovedObject;

			_obj.saveState();
			index++;

			state[index] = JSON.stringify(_obj._stateProperties);
			list[index] = _obj;
			clipPathObj[index] = _obj.clipPath;
			updateSendObject(index, _obj);
			updateAddDeleteObject(index, _obj);

			lastObj = $.extend(true, {}, _obj);
		}

		//console.trace();
		updateRuButtons();
	}

	function updateSendObject(index, obj) {
		if (sendObjectBack)
			indexState[index] = "SendBack";
		else if (sendObjectFront)
			indexState[index] = "SendFront";
		else
			indexState[index] = null;
	}

	function updateAddDeleteObject(index, obj) {
		if (addedObject)
			objectAddDelete[index] = "Added";
		else if (removedObject)
			objectAddDelete[index] = "Removed";
		else if (clonedObject)
			objectAddDelete[index] = "Cloned";
		else if (croppedObject)
			objectAddDelete[index] = "Cropped";
		else
			objectAddDelete[index] = null;

		addedObject = removedObject = clonedObject = croppedObject = false;
	}

	function undo() {

		if (index <= 0) {
			index = 0;
			return;
		}
		canvas.discardActiveObject();

		var found = findCanvasObject(list[index - 1].itemID, 'itemID', '', '');

		//should we jump next one?
		//compare current object to next object if its the same or not.
		if (list[index].itemID != list[index - 1].itemID && found && index - 2 > 0) //if not found it was deleted already.
		{
			index -= 2;
		}
		else
			index--;

		obj = list[index];
		var setOptions = true;
		var dropIndex = false;

		if (!found || objectAddDelete[index] == "Removed") //need to add it back in.
		{
			canvas.add(obj);
			updateGreenMark("add", obj);
			//updateGreenMark('add',obj.imageID);
			//dropIndex = true;
		}

		if ($.inArray(objectAddDelete[index], ["Added", "Cloned"]) != -1 && index != 0) {
			var o = obj;
			canvas.remove(obj);
			updateGreenMark('remove', o);
			$(".all_menus").remove();
			setOptions = false;
			//dropIndex = true;
		}

		if (setOptions) {
			if (dropIndex) {
				index--;
				obj = list[index];
			}
			obj.setOptions(JSON.parse(state[index]));
			obj.clipPath = clipPathObj[index];

			obj.setCoords();
			redo_undo_action = true;
			canvas.setActiveObject(obj);
			if (obj.type === 'CzImage') {
				redoUndoFilterBorder(obj);
				if (objectAddDelete[index] == "Cropped")
					obj.rerender(null, null);
			}

			if (indexState[index] == "SendBack")
				obj.bringForward();
			else if (indexState[index] == "SendFront")
				obj.sendBackwards();
		}

		dirty = true;
		updateRuButtons();

	}

	function redo() {

		if (index >= state.length - 1)
			return;

		canvas.discardActiveObject();

		var found = findCanvasObject(list[index + 1].itemID, 'itemID', '', '');

		//should we jump next one?
		//compare current object to next object if its the same or not.
		if (list[index].itemID != list[index + 1].itemID && found && index + 2 < state.length - 1) //if not found it was deleted already.
		{
			index += 2;
		}
		else
			index++;

		obj = list[index];
		var setOptions = true;
		var addIndex = false;

		if (!found || $.inArray(objectAddDelete[index], ["Added", "Cloned"]) != -1) //need to add it back in.
		{
			canvas.add(obj);
			updateGreenMark('add', obj);
			//addIndex = true;
		}

		if (objectAddDelete[index] == "Removed") {
			var o = obj;
			canvas.remove(obj);
			updateGreenMark('add', o);
			$(".all_menus").remove();
			setOptions = false;
		}


		if (setOptions) {
			if (addIndex) {
				index++;
				obj = list[index];
			}
			obj.setOptions(JSON.parse(state[index]));
			obj.clipPath = clipPathObj[index];

			obj.setCoords();
			redo_undo_action = true;
			canvas.setActiveObject(obj);
			if (obj.type === 'CzImage') {
				redoUndoFilterBorder(obj);
				if (objectAddDelete[index] == "Cropped")
					obj.rerender(null, null);
			}

			if (indexState[index] == "SendBack")
				obj.sendBackwards();
			else if (indexState[index] == "SendFront")
				obj.bringForward();
		}

		dirty = true;
		updateRuButtons();

	}

	function updateRuButtons() {
		if (index >= list.length - 1)
			$(".redo").attr("disabled", true);
		else
			$(".redo").removeAttr("disabled");

		if (index == 0)
			$(".undo").attr("disabled", true);
		else
			$(".undo").removeAttr("disabled");

	}

	function redoUndoFilterBorder(obj) {
		//only for images.. text has no filters.

		//if any filters, extract them them push them backin so we get applyto etc added in.
		if (obj.filters && obj.filters.length > 0) {
			var _filters = [];
			$.each(obj.filters, function (k, v) {
				if (v && v.brightness)
					_filters.push(new fabric.Image.filters.Brightness({ brightness: v.brightness }));
				else if (v && v.contrast)
					_filters.push(new fabric.Image.filters.Contrast({ contrast: v.contrast }));
				else if (v && v.grayscale)
					_filters.push(new fabric.Image.filters.Grayscale());
			});

			obj.filters = []; //clear array;
			if (_filters.length > 0) {
				$.each(_filters, function (k, v) {
					obj.filters.push(this);
				});
			}

		}

		//if we have a bunch of data to use to apply border then....	
		if (('clipPath' in obj) && obj.clipPath && ('my' in obj) && obj.my.hasBorder == 'ON' && ('frame_round_border' in obj) && obj.frame_round_border && ('hasBorder' in obj.my))
			zc.frame_round_border(obj.frame_round_border, obj);
		else if (('cropX' in obj || 'cropY' in obj) || (obj.cx != 0 || obj.cy != 0 || obj.cw != obj.width || obj.ch != obj.height))
			zc.frame_round_border(null, obj);


		setTimeout(function () {
			obj.applyFilters();
			canvas.requestRenderAll();
		}, 50);
	}

	function findCanvasObject(val, property, val2, property2) //find if an object exists on canvas via property
	{
		var objs = canvas.getObjects();
		var pass = false;

		if (val2) {
			$(objs).each(function (i, v) {
				if (v[property] == val && v[property2] == val2) {
					pass = true;
					return false;
				}
			});
		}
		else {
			$(objs).each(function (i, v) {
				if (v[property] == val) {
					pass = true;
					return false;
				}
			});
		}


		return pass;
	}

	function updateGreenMark(action, obj) {
		var id = obj.imageID,
			t = "im",
			bottom = 0;

		if ($.inArray(obj.graphic, ['border', 'background', 'clipart']) != -1)
			t = "gr";
		else if (obj.group_photo) {
			bottom = 18;
			t = "grp";
		}

		var used = '';
		if (obj.graphic == "background")
			used = 'class="bg_used"';
		else if (obj.graphic == "border")
			used = 'class="brdr_used"';

		if (action == "add") {
			//update green check on image.
			var h = '<div title="Image Used" id="used_' + t + "_" + id + '" ' + used + ' style="position:absolute;bottom:' + bottom + 'px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
			$("#" + t + "_" + id).after(h);
		}
		else //remove
		{
			//make sure this id is not still on the page.
			if (!findCanvasObject(id, "imageID"))
				$("#used_" + t + "_" + id).remove();
			else {
				if (obj.group_photo)
					if (!findCanvasObject(id, "imageID", "group_photo", "group")) //make sure if found group also
						$("#used_" + t + "_" + id).remove();
					else if (t == "gr")
						//found clipart or border
						if (!findCanvasObject(id, "imageID", "graphic", "clipart") && !findCanvasObject(id, "imageID", "graphic", "border"))
							$("#used_" + t + "_" + id).remove();
			}
		}
	}

	$('.undo').click(function () {
		undo();
	});

	$('.redo').click(function () {
		redo();
		canvas.renderAll();
	});

	//end redo
	$("#upload_photos").click(
		function (e) {
			//close the add photos;
			if (is_client_page()) {
				$(".close_option").trigger("click");
				window.open(base_url + 'red/upload_ph/mng_pge/' + thisPage, '_blank');
			}
			else if (is_com_user_page()) {
				//lets save data first then go to link on same page.
				goUpload = true;
				alert('Please wait while we save your file first.');
				$("#save").trigger("click");
			}
			else if (is_staff_page()) {
				$(".close_option").trigger("click");
				window.open(base_url + 'red/upload_ph/mng_pge/' + thisTemplate, '_blank');
			}
		}
	);

	if (is_com_user_page()) {
		$("#goBack").click(function (e) {
			$(location).attr('href', base_url + "/red/yrb_pges/list_com");
		});
	}
	// restore pages
	var restore_thumb_div_width = 0;

	$('.nav').on('click', "#restore_page", function (e) {
		e.preventDefault();

		if ($("#restore_div").is(":visible"))
			return true;

		getRestoreThumbs();
		$("#restore_div").show();

	});

	function getRestoreThumbs() {
		restore_thumb_div_width = 0;

		if (is_com_user_page()) {
			req = '/red/yrb_pges/gt_rstr_com_ajax';
			// data = "page="+thisPage;
			data = { "page": thisPage };
		}
		else if (is_client_page()) {
			req = '/red/yrb_pges/gt_rstr_ajax';
			// data = "page="+thisPage;
			data = { "page": thisPage };
		}
		else if (is_staff_page()) {
			req = base_url + 'templates/getRestoreTemplateThumbs_ajax';
			// data = "id="+thisTemplate;
			data = { "id": thisTemplate };
		}
		$.ajax({
			url: req,
			data: data,
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.
				if (data) {
					//remove the thumbs and show new.
					$(".restore_thumb").remove();
					//if found photos then show
					if (data) {
						$("#restore_div").show();

						$.each(data, function (key, val) {
							addRestoreThumb(val);
						});
					}
				}
				else
					alert('It appears there are no restore points to show, or there was a problem retrieving them.');
			}
		});
	}

	//add new thumb
	function addRestoreThumb(data) {
		var title = "Click to restore this page.";

		//id,page_thumbnail,
		//DATE_FORMAT(created_at,"%a, %M %D, %Y at %l:%i %p") as created_at,created_by

		var html = '';
		html += '<div class="restore_thumb panel panel-default">';
		html += '	<img title="' + title + '" restore_id="' + data.id + '" id="restore_' + data.id + '" class="restore_item" src="' + img_path + 'indicator_big.gif" width="210" >';
		html += '	<div style="font-size:12px;" >Saved by: ' + data.created_by + '<br>' + data.created_at + '</div>';
		html += '</div>';

		$("#restore_thumbs").append(html);
		//recalculate div width
		var img1 = new Image();
		img1.id = data.id;
		img1.onload = function () {
			$("#restore_" + this.id).attr("src", this.src);
			var imge_width = $('#restore_' + this.id).width();
			var cur_thumb_width = $("#restore_thumbs").width();
			restore_thumb_div_width += (imge_width + 20);
			if (cur_thumb_width < restore_thumb_div_width)
				$("#restore_thumbs").css("width", restore_thumb_div_width);

		}
		if (is_com_user_page())
			img1.src = "/red/gt_rstr_img_com/" + data.page_thumbnail;
		else if (is_client_page())
			img1.src = "/red/gt_rstr_img/" + data.page_thumbnail;

	}


	$('#restore_div').on('click', ".restore_thumb", function (e) {
		var id = $("img", this).attr("restore_id");
		if (!confirm("Are you sure you want to restore your page to this date?")) return false;
		if (is_com_user_page())
			$(location).attr('href', base_url + 'red/yrb_pges/edt_pges_com/' + thisPage + '/' + id);
		else if (is_client_page())
			$(location).attr('href', base_url + 'red/yrb_pges/edt_pges/' + thisPage + '/' + id);
		else if (is_staff_page())
			$(location).attr('href', base_url + 'templates/page_templates/' + thisTemplate + '/' + id);
	});

	$("#add_clipart").click(function (e) {
		e.preventDefault();

		if ($("#clipart_div").is(":visible"))
			return false;

		$("#clipart_folder").prop('selectedIndex', 0);
		updateCatsList("Clipart");

	});

	function updateCatsList(type) {
		$.ajax({
			url: base_url + 'red/grphc/gtCtsLst_ajax',
			data: is_staff_page() ? { "type": type } : { "type": type, "com": is_com_user_page() },
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				if (data) {
					var html = '<option value="">Select</option>';
					if (type == "Background")
						html += '<option value="solid">Color Palette</option>';

					$.each(data, function (key, val) {
						if (val.catdisabled == '1' || val.subcatdisabled == '1')
							return true; //skip from showing this category if disabled. Scott 2/8/20

						html += '<option value="' + val.cid + '|' + val.scid + '" >' + val.category + "->" + val.subcategory + '</option>';
					});

					$("#" + type.toLowerCase() + "_folder").html(html);
					$("#" + type.toLowerCase() + "_div").show();
				}
				else
					alert('There was a problem. Please try again.');

			}
		});

	}


	$("#clipart_folder").change(function (e) {
		reset_drag_img('clipart');
		$(".clipart_thumb, .clipart_cat_search_link").remove();
		$("#clipart_thumbs").width('');
		$("#clipart_search_term").val('');

		if ($(this).val() == "") return false;

		var subcat_id = $(this).val().split("|")[1];
		getGraphicImages(subcat_id, "Clipart");

	});

	$(".image_search").click(function (e) {

		var cat = $(this).attr("cat"),
			cat_low = cat.toLowerCase(),
			term = $("#" + cat_low + "_search_term").val();

		if (term == "") return false;
		reset_drag_img('clipart');
		$("." + cat_low + "_thumb, ." + cat_low + "_cat_search_link, .graphic_" + cat_low + "_thumb").remove();
		$("#" + cat_low + "_thumbs").width('');

		$("#" + cat_low + "_folder").val('');

		searchGraphicImages(cat, term);

	});

	function searchGraphicImages(type, term) {

		thumb_div_width = 0;

		var type_low = type.toLowerCase();
		$.ajax({
			url: base_url + 'red/grphc/srchClprt',
			data: "type=" + type + "&term=" + term,
			type: "POST",
			dataType: 'json',
			success: function (data) {

				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				//return false;

				$("#" + type_low + "_message").text('');

				if (data) {
					//remove the photos and show new.
					$("." + type_low + "_thumb").remove();

					//if found photos then show
					if (data[0].id) {
						//$("#photos_div").show();

						var curIds = [];

						//grab all image id's on the canvas.
						canvas.forEachObject(function (obj) {
							if (obj.type === 'CzImage' && obj.graphic)
								curIds.push(obj.imageID);
						});

						$.each(data, function (key, val) {
							addThumbGraphic(val, false, curIds, type_low, type, true);
						});
						//no drag if background or border
						if (type == "Clipart")
							setDrag("#" + type_low + "_thumbs");
					}
				}
				else
					$("#" + type_low + "_message").text('No Images Found. Please try different search terms.');
			}
		});
	}



	function getGraphicImages(subcat_id, type) {

		thumb_div_width = 0;

		var type_low = type.toLowerCase();

		if (is_com_user_page()) {
			req = '/red/grphc/gtClprt_com';
			// data = "subcat_id="+subcat_id+"&type="+type;
			data = { "subcat_id": subcat_id, "type": type };
		}
		else if (is_client_page()) {
			req = '/red/grphc/gtClprt';
			// data = "subcat_id="+subcat_id+"&type="+type;
			data = { "subcat_id": subcat_id, "type": type };
		}
		else if (is_staff_page()) {
			req = base_url + 'red/grphc/gtClprt';
			// data = "subcat_id="+subcat_id+"&staff=staff"
			data = { "subcat_id": subcat_id, "staff": "staff" }
		}
		$.ajax({
			url: req,
			data: data,
			type: "POST",
			dataType: 'json',
			success: function (data) {

				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				//return false;

				$("#" + type_low + "_message").text('');

				if (data) {
					//remove the photos and show new.
					$("." + type_low + "_thumb").remove();

					//if found photos then show
					if (data[0].id) {
						//$("#photos_div").show();

						var curIds = [];

						//grab all image id's on the canvas.
						canvas.forEachObject(function (obj) {
							if (obj.type === 'CzImage' && obj.graphic)
								curIds.push(obj.imageID);
						});

						$.each(data, function (key, val) {
							addThumbGraphic(val, false, curIds, type_low, type, false);
						});
						//no drag if background or border
						if (type == "Clipart")
							setDrag("#" + type_low + "_thumbs");
					}
				}
				else
					$("#" + type_low + "_message").text('No Images Found. Please try a different category.');
			}
		});
	}


	//add new thumb
	function addThumbGraphic(data, upload, curIds, type_low, type, is_search) {
		if (!upload)
			data.image = data.image.split("|")[1];

		//look if image exists on canvas.
		var found = $.inArray(data.id, curIds) != -1 ? true : false;
		var this_page = is_staff_page() ? thisTemplate.toString() : thisPage.toString();
		var found_other = false;


		//check if used elsewhere
		if (data.used_pages != null) {
			var t = data.used_pages.split(",");
			if (t.length > 0) {
				$.each(t, function (i, v) {
					if (v != this_page) //must be from other page
					{
						found_other = true;
						return false;
					}
				});
			}
		}

		var title = type == "Clipart" ? data.o_image_name : "Click to use this style";

		//do we have a matching background by src?
		var cur_bg = null;
		if (canvas.backgroundImage != null)
			cur_bg = canvas.backgroundImage._element.src.replace(/^.*\/\/[^\/]+/, '');
		//https://ym.dev/red/grphc/get_med/16_1618381879.JPG/Background/1

		var bg_found = cur_bg != null && cur_bg == "/red/grphc/get_med/" + data.image + "/" + type + "/1" ? true : false;

		if (type == "Background")
			var used = 'bg_used';
		else if (type == "Border")
			var used = 'brdr_used';

		//if searching we adding in category link
		if (is_search) {
			//get the category name pair from the select menu.
			var catname = $("#" + type_low + "_folder option[value='" + data.cat_id + "']").text();
			var html = '';
			html += '<div class="graphic_thumb graphic_' + type_low + '_thumb">';
			html += '	<div style="max-height: 140px;" class="list_image ' + type_low + '_thumb" title="" image_id="' + data.id + '">';
			html += '		<div id="img_div">';
			html += '			<img graphic="' + type_low + '" title="' + title + '" draggable="true" im_id="' + data.id + '" id="gr_' + data.id + '" class="item" src="' + img_path + 'indicator_big.gif" height="100" >';
			if ((found && !found_other) || bg_found)
				html += '		<div title="Image Used" class="' + used + '" id="used_gr_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
			else if (found_other && data.used_pages != null)
				html += '		<div title="Image Used On Other Pages" class="yellow ' + used + '" id="used_gr_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'yellow_check_circle.png"></div>';
			html += '		</div>';
			html += '	</div>';
			html += '	<div category="' + data.cat_id + '" class="' + type_low + '_cat_search_link" style="font-size:10px; text-align: center; text-decoration: underline; cursor:pointer;" >' + catname.replace("->", ":<br>") + '</div>';
			html += '</div>';
			$("#" + type_low + "_thumbs").css("height", "140px");

		}
		else {

			var html = '';
			html += '<div class="list_image ' + type_low + '_thumb" title="" image_id="' + data.id + '">';
			html += '	<div id="img_div">';
			html += '		<img graphic="' + type_low + '" title="' + title + '" draggable="true" im_id="' + data.id + '" id="gr_' + data.id + '" class="item" src="' + img_path + 'indicator_big.gif" height="100" >';
			if ((found && !found_other) || bg_found)
				html += '	<div title="Image Used" class="' + used + '" id="used_gr_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
			else if (found_other && data.used_pages != null)
				html += '	<div title="Image Used On Other Pages" class="yellow ' + used + '" id="used_gr_' + data.id + '" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'yellow_check_circle.png"></div>';
			html += '	</div>';
			html += '</div>';
			$("#" + type_low + "_thumbs").css("height", "110px");

		}


		$("#" + type_low + "_thumbs").append(html);
		//recalculate div width
		var img1 = new Image();
		img1.id = data.id;
		img1.onload = function () {

			$("#gr_" + this.id).attr("src", this.src.replace(/^.*\/\/[^\/]+/, ''));
			var imge_width = $('#gr_' + this.id).width();
			var cur_thumb_width = $("#thumbs").width();
			thumb_div_width += (imge_width + 30);
			if (cur_thumb_width < thumb_div_width)
				$("#" + type_low + "_thumbs").css("width", thumb_div_width);

		}
		img1.src = "/red/grphc/get_med/" + data.image + "/" + type;


		$(`.list_image.${type_low}_thumb`).on('click', function (e) {
			$('.list_image.image').removeClass('active');
			var list_images = $(`.list_image.${type_low}_thumb`);
			for (var i = 0; i < list_images.length; i++) {
				if ($(list_images[i]).attr('image_id') != $(this).attr('image_id')) {
					$(list_images[i]).removeClass('active');
				}
			}
			$(this).addClass('active');
			dragImg = this.querySelector('img');
		});
	}

	$('#clipart_thumbs').on('click', ".clipart_cat_search_link", function (e) {

		var category_search_value = $(this).attr("category");
		$("#clipart_folder").val(category_search_value).change();

	});

	$('#border_thumbs').on('click', ".border_cat_search_link", function (e) {

		var category_search_value = $(this).attr("category");
		$("#border_folder").val(category_search_value).change();

	});

	$('#background_thumbs').on('click', ".background_cat_search_link", function (e) {

		var category_search_value = $(this).attr("category");
		$("#background_folder").val(category_search_value).change();

	});


	$("#add_page_border").click(function (e) {
		e.preventDefault();

		if ($("#border_div").is(":visible"))
			return false;

		$("#border_folder").prop('selectedIndex', 0);
		$(".border_thumb").remove();
		//$("#border_thumbs").width(0);
		updateCatsList("Border");

	});

	$("#border_folder").change(function (e) {
		$(".border_thumb, .border_cat_search_link").remove();
		$("#border_thumbs").width('');
		$("#border_search_term").val('');

		if ($(this).val() == "") return false;

		var subcat_id = $(this).val().split("|")[1];
		getGraphicImages(subcat_id, "Border");

	});

	$('#border_div').on('click', ".border_thumb", function (e) {

		var im_id = $(this).attr("image_id");
		var src = $("img", this).attr("src") + "/1"; //the 1 makes it pull the original uploaded image.
		$("#remove_border").after('<span id="border_loading_gif"><br><i style="font-size: 1.5em;" class="fa fa-spinner fa-pulse fa-fw"></i> The border is loading...</span>');

		//search for a border image.
		var obj = canvas.item(0);
		if (obj.graphic == "border") //replace the border
		{
			var img = new Image();
			img.onload = function () {
				obj.setElement(img);
				obj.set({
					src: src,
					primarySrc: src,
					imageID: im_id
				});
				canvas.renderAll();
				$("#border_loading_gif").remove();
				$(".brdr_used").each(function (index, element) {
					if (!$(this).hasClass("yellow"))
						$(this).remove();
				});
				updateGreenMark("add", { imageID: im_id, graphic: 'border' });
			};
			img.src = src;
		}
		else {
			var top_left = 0; //trim*globalScale;	.43 and .4295 for full size image.	
			var opts = { x: top_left, y: top_left, scalex: 1, scaley: 1, scale: globalScale, imageID: im_id, graphic: "border", evented: false, group_photo: null };
			zc.init(src, opts);
		}

		dirty = true;
		saveState();

	});

	function setBorderBack() //send the border to the back
	{
		//search for a border image.
		canvas.forEachObject(function (obj) {
			if (obj.type === 'CzImage' && obj.graphic == "border")
				obj.sendToBack();
		});
	}

	$('#border_div').on('click', "#remove_border", function (e) {
		//search for a border image.		
		var obj = canvas.item(0);
		if (obj.graphic == "border") //remove it now.
		{
			canvas.remove(obj);
			$(".brdr_used").each(function (index, element) {
				if (!$(this).hasClass("yellow"))
					$(this).remove();
			});
			dirty = true;
			saveState();
		}
	});


	$("#add_background").click(function (e) {
		e.preventDefault();

		if ($("#background_div").is(":visible"))
			return false;

		$("#background_folder").prop('selectedIndex', 0);
		$(".background_thumb").remove();
		//$("#background_thumbs").width(0);
		updateCatsList("Background");

	});

	if (is_com_user_page()) {
		$("#faq").click(function (e) {
			e.preventDefault();

			if ($("#faq_div").is(":visible"))
				return false;

			$("#faq_div").show();

		});
	}

	$("#background_folder").change(function (e) {

		$(".background_thumb, .background_cat_search_link").remove();
		$("#background_thumbs").width('');
		$("#background_search_term").val('');

		if ($(this).val() == "") return false;

		if ($(this).val() == "solid")
			getBackgrounds();
		else {
			var subcat_id = $(this).val().split("|")[1];
			getGraphicImages(subcat_id, "Background");
		}
	});

	//Function to convert hex format to a rgb color
	function rgb2hex(rgb) {
		rgb = rgb.match(/^rgb?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
		return (rgb && rgb.length === 4) ? "#" +
			("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
			("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
	}

	function getBackgrounds() {

		$("#background_message").text('');
		$("#background_search_term").val('');

		bgs_div_width = 0;

		var clrs = ['#FF00FF', '#FF33FF', '#CC00CC', '#FF66FF', '#CC33CC', '#990099', '#FF99FF', '#CC66CC', '#993399', '#660066', '#FFCCFF', '#CC99CC', '#996699', '#663366', '#330033', '#CC00FF', '#CC33FF', '#9900CC', '#CC66FF', '#9933CC', '#660099', '#CC99FF', '#9966CC', '#663399', '#330066', '#9900FF', '#9933FF', '#6600CC', '#9966FF', '#6633CC', '#330099', '#6600FF', '#6633FF', '#3300CC', '#3300FF', '#0000FF', '#3333FF', '#0000CC', '#6666FF', '#3333CC', '#000099', '#9999FF', '#6666CC', '#333399', '#000066', '#CCCCFF', '#9999CC', '#666699', '#333366', '#000033', '#0033FF', '#3366FF', '#0033CC', '#0066FF', '#6699FF', '#3366CC', '#003399', '#3399FF', '#0066CC', '#0099FF', '#99CCFF', '#6699CC', '#336699', '#003366', '#66CCFF', '#3399CC', '#006699', '#33CCFF', '#0099CC', '#00CCFF', '#00FFFF', '#33FFFF', '#00CCCC', '#66FFFF', '#33CCCC', '#009999', '#99FFFF', '#66CCCC', '#339999', '#006666', '#CCFFFF', '#99CCCC', '#669999', '#336666', '#003333', '#00FFCC', '#33FFCC', '#00CC99', '#66FFCC', '#33CC99', '#009966', '#99FFCC', '#66CC99', '#339966', '#006633', '#00FF99', '#33FF99', '#00CC66', '#66FF99', '#33CC66', '#009933', '#00FF66', '#33FF66', '#00CC33', '#00FF33', '#00FF00', '#33FF33', '#00CC00', '#66FF66', '#33CC33', '#009900', '#99FF99', '#66CC66', '#339933', '#006600', '#CCFFCC', '#99CC99', '#669966', '#336633', '#003300', '#33FF00', '#66FF33', '#33CC00', '#66FF00', '#99FF66', '#66CC33', '#339900', '#99FF33', '#66CC00', '#99FF00', '#CCFF99', '#99CC66', '#669933', '#336600', '#CCFF66', '#99CC33', '#669900', '#CCFF33', '#99CC00', '#CCFF00', '#FFFF00', '#FFFF33', '#CCCC00', '#FFFF66', '#CCCC33', '#999900', '#FFFF99', '#CCCC66', '#999933', '#666600', '#FFFFCC', '#CCCC99', '#999966', '#666633', '#333300', '#FFCC00', '#FFCC33', '#CC9900', '#FFCC66', '#CC9933', '#996600', '#FFCC99', '#CC9966', '#996633', '#663300', '#FF9900', '#FF9933', '#CC6600', '#FF9966', '#CC6633', '#993300', '#FF6600', '#FF6633', '#CC3300', '#FF3300', '#FF0000', '#FF3333', '#CC0000', '#FF6666', '#CC3333', '#990000', '#FF9999', '#CC6666', '#993333', '#660000', '#FFCCCC', '#CC9999', '#996666', '#663333', '#330000', '#FF0033', '#FF3366', '#CC0033', '#FF0066', '#FF6699', '#CC3366', '#990033', '#FF3399', '#CC0066', '#FF0099', '#FF99CC', '#CC6699', '#993366', '#660033', '#FF66CC', '#CC3399', '#990066', '#FF33CC', '#CC0099', '#FF00CC', '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000'];

		var cur_clr = null;
		if (canvas.backgroundColor != null)
			cur_clr = rgb2hex(canvas.backgroundColor).toUpperCase();

		$.each(clrs, function (i, v) {
			var html = '';
			html += '<div class="background_thumb color" id="clr_' + i + '" title="Select This Color" style="background-color:' + v + '">&nbsp;';
			if (cur_clr == v)
				html += '<div title="Color Used" class="bg_used" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
			html += '</div>';

			$("#background_thumbs").append(html);
			//bgs_div_width
			var bgs_width = 100;
			var cur_bgs_width = $("#background_thumbs").width();
			bgs_div_width += (bgs_width + 4);
			if (cur_bgs_width < bgs_div_width)
				$("#background_thumbs").css("width", bgs_div_width);

		});

		$("#background_div").show();

	}

	$('#background_div').on('click', ".background_thumb", function (e) {
		if ($(this).hasClass("color")) {
			//remove any image
			canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));

			canvas.setBackgroundColor($(this).css("background-color"), canvas.renderAll.bind(canvas));
			$(".bg_used").remove();
			html = '<div title="Color Used" class="bg_used" style="position:absolute;bottom:0px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
			$(this).append(html);
		}
		else {

			var im_id = $(this).attr("image_id");

			//remove any color
			canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));

			var src = $("img", this).attr("src") + "/1"; //the 1 makes it pull the original uploaded image.			
			var img = new Image();
			img.onload = function () {
				canvas.setBackgroundImage(img.src, canvas.renderAll.bind(canvas), {
					originX: 'left',
					originY: 'top',
					left: 0, //bleed*globalScale,
					top: 0, //bleed*globalScale,
					width: canvas.width, // - trim*globalScale),
					height: canvas.height // - trim*globalScale)
				});
				$(".bg_used").remove();
				updateGreenMark("add", { imageID: im_id, graphic: 'background' });
				$("#background_loading_gif").remove();
			};
			$("#remove_background").after('<span id="background_loading_gif"><br><i style="font-size: 1.5em;" class="fa fa-spinner fa-pulse fa-fw"></i> The background is loading...</span>');
			img.src = src;
		}

		dirty = true;
	});

	$('#background_div').on('click', "#remove_background", function (e) {
		canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));
		canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));

		$(".bg_used").remove();

		dirty = true;
	});

	var template_thumb_div_width = 0;

	$('.nav').on('click', "#add_template", function (e) {
		e.preventDefault();

		if ($("#template_div").is(":visible"))
			return true;

		updatePageTemplateCatsList();
		$("#template_div").show();

	});


	function updatePageTemplateCatsList() {

		//intercept this if coming from restore.
		/*if (restore_id)
		{
			thisTemplate = restore_id;
			restore_id = null;
			$("#template_div").hide();
			loadCanvas();
			return false;
		}*/
		$.ajax({
			url: base_url + 'red/tmplt/gtPgTmpltsLst_ajax',
			data: { "cats": "cats", "com": is_com_user_page() },
			type: "POST",
			dataType: 'json',
			success: function (data) {
				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				var html = '';

				if (data) {
					$.each(data, function (key, val) {
						html += '<option value="' + val.cid + '|' + val.scid + '" >' + val.category + "->" + val.subcategory + '</option>';
					});

					$("#template_category").html(html);
					$("#template_category").trigger("change");
				}
				else
					alert('Errr..., no categories exist!');
			}
		});
	}

	//updatePageTemplateCatsList();

	$("#template_category").change(function (e) {

		$(".template_thumb").remove();
		$("#template_thumbs").width('');

		if ($(this).val() == "") return false;

		var subcat_id = $(this).val().split("|")[1];
		getTemplateImages(subcat_id);

	});



	function getTemplateImages(subcat_id) {

		$("#template_message").html('');
		template_thumb_div_width = 0;

		//$(this).addClass("loading_gif");
		var _this = $(this);
		$.ajax({
			url: base_url + 'red/tmplt/gtPgTmplts_ajax',
			data:
			{
				"subcat_id": subcat_id,
				"client": "client",
				"com": is_com_user_page()
			},
			type: "POST",
			dataType: 'json',
			success: function (data) {

				if (!check_login_ajax(data)) return false; //redirect if not logged in.

				if (data) {
					//remove the photos and show new.
					$(".template_thumb").remove();

					//if found photos then show
					if (data[0].id) {
						$("#template_div").show();

						$.each(data, function (key, val) {
							addTemplateThumb(val);
						});
					}

				}
				else {
					$(".template_thumb").remove();
					$("#template_message").html('No results found.');
				}

				//_this.removeClass("loading_gif");	

			}
		});

	}


	//add new thumb
	function addTemplateThumb(data) {

		/*[{"id":"1","template_name":"name","image":"2_thumb_11372876.PNG","active":"1","used":"58"},{"id":"5"
		,"template_name":"test that","image":"","active":"1","used":null},{"id":"6","template_name":"test that1"
		,"image":"","active":"1","used":null},{"id":"4","template_name":"test this","image":"","active":"0","used"
		:null}]*/

		if (data.image) {
			var image = data.image;
			var newtemp = '';
		}
		else {
			var image = 'new_template.png';
			var newtemp = 'newtemplate';
		}

		var name = data.template_name ? data.template_name : 'No Name Entered';
		//var active = data.id == thisTemplate ? "active_template" : "";

		var html = '';
		html += '<div class="template_thumb panel panel-default ' + newtemp + '" title="" image_id="' + data.id + '" >';
		//html += '	<div id="img_div">';
		html += '		<img title="' + name + '" template_id="' + data.id + '" id="template_' + data.id + '" class="template_item" src="' + img_path + 'indicator_big.gif" width="210" >';
		if (data.used || data.id == thisTemplate)
			html += '	<div title="Template Used" template_id="used_template_' + data.id + '" style="position:absolute;bottom:18px;right:0px;"><img style="height:30px; width:30px;" class="check_mark" src="' + img_path + 'green_check_circle.png"></div>';
		//html += '	</div>';
		html += '	<div style="font-size:12px;" >' + name + '</div>';
		html += '</div>';

		/*var html = '';
		html += '<div class="template_thumb panel panel-default '+newtemp+'" title="" image_id="'+data.id+'" >';
		html +=	'	<img title="'+title+'" restore_id="'+data.id+'" id="restore_'+data.id+'" class="restore_item" src="'+img_path+'indicator_big.gif" width="210" >';
		html +=	'	<div style="font-size:12px;" >Saved by: '+data.created_by+'<br>'+data.created_at+'</div>';
		html += '</div>';*/

		$("#template_thumbs").append(html);
		//recalculate div width
		var img1 = new Image();
		img1.id = data.id;
		img1.onload = function () {

			$("#template_" + this.id).attr("src", this.src.replace(/^.*\/\/[^\/]+/, ''));
			var imge_width = $('#template_' + this.id).width();
			var cur_thumb_width = $("#template_thumbs").width();
			template_thumb_div_width += (imge_width + 15);
			if (cur_thumb_width < template_thumb_div_width)
				$("#template_thumbs").css("width", template_thumb_div_width);

		}
		img1.src = "/red/tmplt/get_tmpl_med/" + image;

	}

	$('#template_div').on('click', ".template_thumb", function (e) {

		var id = $(this).attr("image_id");
		if (!confirm("Are you sure you want to use this template? Your current page will be erased and replaced with the template.")) return false;
		if (is_com_user_page())
			$(location).attr('href', base_url + 'red/yrb_pges/edt_pges_com/' + thisPage + '/0/' + id);
		else
			$(location).attr('href', base_url + 'red/yrb_pges/edt_pges/' + thisPage + '/0/' + id);

	});

	$(".print_draft").click(function (e) {

		//if (grid_showing)
		removeGrid();

		var page = canvas.toDataURL({
			format: 'jpg',
			left: trim,
			top: trim,
			width: canvas.width - (trim * 2),
			height: canvas.height - (trim * 2),
			quality: 1,
			multiplier: 1
		});

		if (grid_showing)
			addGrid();

		var image = new Image();
		image.src = page;


		var h = '<img src="' + page + '" width="100%">';
		var x = window.open();
		x.document.open();
		x.document.write(h);
		x.document.close();

	});

	$("#loading").show();

	//check if web fonts loadedbefore starting.	
	var webfontload_timer = null;
	if (!webfontsloaded)
		webfontload_timer = setInterval(function () {
			checkstart();
		}, 500); //.5 second
	else
		checkstart();

	//if load canvas not started yet this will kick it off after 10 seconds., stuff happens
	setTimeout(function () {
		if (!webfontsloaded) {
			webfontsloaded = true;
			checkstart();
		}
	}, 10000);

	function checkstart() {
		if (webfontsloaded) {
			//add in a small delay.
			setTimeout(function () {
				loadCanvas();
			}, 5000);

			if (typeof webfontload_timer != 'undefined')
				clearInterval(webfontload_timer);

		}
	}

	$('#add_photo_to_canvas').on('click', function (e) {
		if (!check_drag_img('photos') || !dragImg) {
			alert("No photo selected!");
			return;
		}
		var img_id = $(dragImg).attr('im_id');
		var graphic = $(dragImg).attr("graphic") ? $(dragImg).attr("graphic") : null;
		var group_photo = $(dragImg).attr("group_photo") ? $(dragImg).attr("group_photo") : null;
		var opts = { x: 30, y: 30, scalex: 1, scaley: 1, scale: globalScale, imageID: img_id, graphic: graphic, evented: true, group_photo: group_photo };
		zc.init(dragImg.src, opts);
		remove_drag_img_select();
	});

	$('#add_clipart_to_canvas').on('click', function (e) {
		if (!check_drag_img('clipart') || !dragImg) {
			alert("No asset selected!");
			return;
		}
		var img_id = $(dragImg).attr('im_id');
		var graphic = $(dragImg).attr("graphic") ? $(dragImg).attr("graphic") : null;
		var group_photo = $(dragImg).attr("group_photo") ? $(dragImg).attr("group_photo") : null;
		var opts = { x: 30, y: 30, scalex: 1, scaley: 1, scale: globalScale, imageID: img_id, graphic: graphic, evented: true, group_photo: group_photo };
		zc.init(dragImg.src, opts);

		remove_drag_img_select();
	});

	function remove_drag_img_select() {
		$(`.list_image`).removeClass('active');
		dragImg = null;
	}

	function reset_drag_img(div) {
		var image_class = '';

		if (div === "photos") {
			image_class = 'clipart_thumb';
		}
		if (div === "clipart") {
			image_class = 'image';
		}
		var images = $(`.list_image.${image_class}`);
		var flag = true;
		for (var i = 0; i < images.length; i++) {
			if ($(images[i]).hasClass('active')) {
				flag = false;
				break;
			}
		}
		if (flag) {
			dragImg = null;
		}
	}

	function check_drag_img(div) {
		var image_class = '';

		if (div === "photos") {
			image_class = 'clipart_thumb';
		}
		if (div === "clipart") {
			image_class = 'image';
		}
		var images = $(`.list_image.${image_class}`);
		var flag = true;
		for (var i = 0; i < images.length; i++) {
			if ($(images[i]).hasClass('active')) {
				flag = false;
				break;
			}
		}
		return flag;
	}

	$("#add_placeholder").click(function (e) {
		$('#plc_div').show();
	});

	$('#aspect_ratio_select').change(function () {
		var val = $(this).val();
		if (val == "custom") {
			$('.custom_ratio_div').show();
		} else {
			$('.custom_ratio_div').hide();
		}
	})

	$('#add_plc_to_canvas').click(function (e) {
		var ratiostr = $('#aspect_ratio_select').val();
		var ratiow = 1;
		var ratioh = 1;
		var width = 400;
		var height = 400;
		if (ratiostr == "custom") {
			ratiow = $('#aspect_width').val();
			ratioh = $('#aspect_height').val();

		} else {
			ratiow = parseInt(ratiostr.split(':')[0]);
			ratioh = parseInt(ratiostr.split(':')[1]);
		}
		// var src = '/red/tmplt/get_tmpl_med/placeholder.png'
		var src = '/fe/assets/images/placeholder/placeholder_1_1.png'
		var d = 200 * globalScale;	// .43 and .4295 for full size image.
		var h2w = ratioh / ratiow;
		// the text in placeholder
		if (h2w <= 0.6) {
			src = '/fe/assets/images/placeholder/placeholder_16_9.png'
		} else if (h2w <= 0.7) {
			src = '/fe/assets/images/placeholder/placeholder_4_3.png'
		} else if (h2w <= 0.77) {
			src = '/fe/assets/images/placeholder/placeholder_5_4.png'
		} else if (h2w <= 0.9) {
			src = '/fe/assets/images/placeholder/placeholder_3_2.png'
		} else if (h2w <= 1.1) {
			src = '/fe/assets/images/placeholder/placeholder_1_1.png'
		} else if (h2w <= 1.28) {
			src = '/fe/assets/images/placeholder/placeholder_4_5.png'
		} else if (h2w <= 1.41) {
			src = '/fe/assets/images/placeholder/placeholder_3_4.png'
		} else if (h2w <= 1.65) {
			src = '/fe/assets/images/placeholder/placeholder_2_3.png'
		} else {
			src = '/fe/assets/images/placeholder/placeholder_9_16.png'
		}
		if (ratiow >= ratioh) {
			height = width * ratioh / ratiow;
		} else {
			width = height * ratiow / ratioh;
		}

		var opts = { x: d, y: d, scalex: 1, scaley: 1, width: width, height: height, scale: globalScale, imageID: null, graphic: null, evented: true, group_photo: null };
		zc.init(src, opts);
		dirty = true;
		saveState();
	});

});
