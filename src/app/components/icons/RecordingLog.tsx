'use client';
import { 
  JSX, 
  useEffect,
} from 'react';


const PATH_DATA = {
  'gb-discbook-fill': 'M99.875 54.5335C89.65 54.5335 81.3422 62.8401 81.3438 73.0647L81.3438 282.377C81.344 291.85 88.5085 299.59 97.6875 300.69L97.6875 313.44C97.6875 323.617 109.56 329.179 117.375 322.658L119.5 320.877L121.625 322.658C129.44 329.179 141.314 323.617 141.312 313.44L141.312 300.908L237.219 300.908C260.034 300.909 278.655 282.286 278.656 259.471L278.656 95.971C278.656 73.156 260.037 54.5335 237.219 54.5335C236.146 54.5335 100.951 54.5335 99.875 54.5335Z',
  'gb-discbook-fill-2': 'M109.692 288.902L109.692 313.428L119.502 305.253L129.313 313.428L129.313 288.902L109.692 288.902Z',
  'gb-discbook-fill-3': 'M237.227 288.902L99.8816 288.902C96.2844 288.902 93.3413 285.959 93.3413 282.362L93.3413 73.0729C93.3413 69.4757 96.2844 66.5326 99.8816 66.5326L237.227 66.5326C253.415 66.5326 266.659 79.7767 266.659 95.9639L266.659 259.471C266.659 275.658 253.415 288.902 237.227 288.902Z',
  'gb-discbook-fill-4': 'M180 124.315C157.783 124.315 138.878 138.317 131.469 157.94L93.3438 157.94L93.3438 195.783L131.906 195.783C139.63 214.761 158.247 228.158 180 228.158C201.752 228.158 220.369 214.761 228.094 195.783L266.656 195.783L266.656 157.94L228.531 157.94C221.122 138.317 202.216 124.315 180 124.315Z',
  'gb-discbook-fill-5': 'M180 135.2C157.333 135.2 138.957 153.575 138.957 176.242C138.957 198.91 157.333 217.285 180 217.285C202.667 217.285 221.043 198.91 221.043 176.242C221.043 153.575 202.667 135.2 180 135.2Z',
};

export function RecordingLogIcon(): JSX.Element {
  useEffect(() => {}, []);

  return <svg 
    version="1.1"
    viewBox="0 0 360 360" 
    height="100%" width="100%" 
    fillRule='nonzero' clipRule='evenodd'
    strokeLinecap='round' strokeLinejoin='round'
    stroke-miterlimit="10"
    xmlSpace="preserve" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink"
  >
    <defs>
      <path d={ PATH_DATA['gb-discbook-fill'] } id="gb-discbook-fill"/>

      <filter 
        id="gb-discbook-filter" 
        x="60.3438" y="33.5335"
        height="312.933" width="239.312" 
        filterUnits="userSpaceOnUse" 
        color-interpolation-filters="sRGB" 
      >
        <feDropShadow dx="0" dy="-0" flood-color="#000000" flood-opacity="1" in="SourceGraphic" result="Shadow" stdDeviation="6"/>
      </filter>
      <path 
        id="gb-discbook-fill-2"
        d={ PATH_DATA['gb-discbook-fill-2'] } 
      />
      <path 
        id="gb-discbook-fill-3"
        d={ PATH_DATA['gb-discbook-fill-3'] }
      />
      <path 
        id="gb-discbook-fill-4"
        d={ PATH_DATA['gb-discbook-fill-4'] }
      />
      <path 
        id="gb-discbook-fill-5"
        d={ PATH_DATA['gb-discbook-fill-5'] }
      />
    </defs>

    <g id="gb-discbook-static">
      <g filter="url(#gb-discbook-filter)">
        <use fill="#ffffff" fill-rule="nonzero" stroke="none" xlinkHref="#gb-discbook-fill" />
        <mask height="282.933" id="gb-discbook-strokemask" maskUnits="userSpaceOnUse" width="209.312" x="75.3438" y="48.5335">
          <rect fill="#ffffff" height="282.933" stroke="none" width="209.312" x="75.3438" y="48.5335" />
          <use fill="#000000" fill-rule="evenodd" stroke="none" xlinkHref="#gb-discbook-fill"/>
        </mask>
        <use fill="none" mask="url(#gb-discbook-strokemask)" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" xlinkHref="#gb-discBook-Fill"/>
      </g>

      <g opacity="1">
        <use fill="#dc4c30" fill-rule="nonzero" stroke="none" xlinkHref="#gb-discBook-Fill_2"/>
        <mask height="36.526" id="gb-discBook-StrokeMask_2" maskUnits="userSpaceOnUse" width="31.6208" x="103.692" y="282.902">
          <rect fill="#ffffff" height="36.526" stroke="none" width="31.6208" x="103.692" y="282.902"/>
          <use fill="#000000" fill-rule="evenodd" stroke="none" xlinkHref="#gb-discBook-Fill_2"/>
        </mask>
        <use fill="none" mask="url(#gb-discBook-StrokeMask_2)" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" xlinkHref="#gb-discBook-Fill_2"/>
      </g>

      <g opacity="1">
        <g opacity="1">
          <use fill="#ffac00" fill-opacity="0.997759" fill-rule="nonzero" stroke="none" xlinkHref="#gb-discBook-Fill_3"/>
          <mask height="234.369" id="gb-discBook-StrokeMask_3" maskUnits="userSpaceOnUse" width="185.317" x="87.3413" y="60.5326">
            <rect fill="#ffffff" height="234.369" stroke="none" width="185.317" x="87.3413" y="60.5326"/>
            <use fill="#000000" fill-rule="evenodd" stroke="none" xlinkHref="#gb-discBook-Fill_3"/>
          </mask>
          <use fill="none" mask="url(#gb-discBook-StrokeMask_3)" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" xlinkHref="#gb-discBook-Fill_3"/>
        </g>

        <path d="M93.3413 66.5326L116.232 66.5326L116.232 288.902L93.3413 288.902L93.3413 66.5326Z" fill="#ffdc66" fill-opacity="0.997759" fill-rule="nonzero" opacity="1" stroke="none"/>
        <path d="M115.597 284.471C114.695 284.471 113.962 283.738 113.962 282.836L113.962 208.163C113.962 207.26 114.695 206.528 115.597 206.528C116.5 206.528 117.232 207.26 117.232 208.163L117.232 282.836C117.232 283.738 116.5 284.471 115.597 284.471ZM115.597 145.855C114.695 145.855 113.962 145.122 113.962 144.22L113.962 71.1677C113.962 70.2651 114.695 69.5326 115.597 69.5326C116.5 69.5326 117.232 70.2651 117.232 71.1677L117.232 144.22C117.232 145.122 116.5 145.855 115.597 145.855Z" fill="#1f212b" fill-rule="nonzero" opacity="1" stroke="none"/>
        </g>
        <g opacity="1">
        <g opacity="1">
        <use fill="#ffe9ab" fill-rule="nonzero" stroke="none" xlinkHref="#gb-discBook-Fill_4"/>
        <mask height="113.345" id="gb-discBook-StrokeMask_4" maskUnits="userSpaceOnUse" width="182.814" x="88.5929" y="119.564">
        <rect fill="#ffffff" height="113.345" stroke="none" width="182.814" x="88.5929" y="119.564"/>
        <use fill="#000000" fill-rule="evenodd" stroke="none" xlinkHref="#gb-discBook-Fill_4"/>
        </mask>
        <use fill="none" mask="url(#gb-discBook-StrokeMask_4)" stroke="#000000" stroke-linecap="butt" stroke-linejoin="round" stroke-width="9.50165" xlinkHref="#gb-discBook-Fill_4"/>
        </g>
        <g opacity="1">
        <use fill="#000000" fill-rule="nonzero" stroke="none" xlinkHref="#gb-discBook-Fill_5"/>
        <mask height="88.0855" id="gb-discBook-StrokeMask_5" maskUnits="userSpaceOnUse" width="88.0855" x="135.957" y="132.2">
        <rect fill="#ffffff" height="88.0855" stroke="none" width="88.0855" x="135.957" y="132.2"/>
        <use fill="#000000" fill-rule="evenodd" stroke="none" xlinkHref="#gb-discBook-Fill_5"/>
        </mask>
        <use fill="none" mask="url(#gb-discBook-StrokeMask_5)" stroke="#000000" stroke-linecap="butt" stroke-linejoin="round" stroke-width="6" xlinkHref="#gb-discBook-Fill_5"/>
        </g>
        <path d="M180 157.75L185.718 169.332L198.502 171.19L189.253 180.208L191.436 192.942L180 186.928L168.567 192.942L170.751 180.208L161.498 171.19L174.282 169.332L180 157.75Z" fill="#ffffff" fill-rule="nonzero" opacity="1" stroke="none"/>
        </g>
      </g>
    </svg>
}