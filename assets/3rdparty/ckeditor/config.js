/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here. For example:
	// config.language = 'fr';
	// config.uiColor = '#AADC6E';
	
	config.toolbarGroups = [
		{ name: 'TF' },	       // TinyFinder group. Do not change group name
		{ name: 'document',		  groups: [ 'mode' ] }, // , 'document', 'doctools'
		// { name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
		// { name: 'editing',     groups: [ 'find', 'selection', 'spellchecker' ] },
		{ name: 'links' },
		{ name: 'insert' },
		// { name: 'forms' },
		// { name: 'tools' },
		// { name: 'others' },
		// '/',
		// { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
		// { name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
		// { name: 'styles' },
		// { name: 'colors' },
		{ name: 'about' }
	];
	
	config.extraPlugins = 'tinyimgfinder,tinyfilefinder';

	config.extraAllowedContent = 'video source[*]; audio source[*];';
	
	config.removeButtons = 'Save,Language,Print,Scayt';
};