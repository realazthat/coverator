import './styles.css';

// const fs = require('fs');
// const path = require('path');
const $ = require('jquery');
const nunjucks = require('nunjucks');
const assert = require('assert');
const FileSaver = require('file-saver');
const BlobStream = require('blob-stream');
const PDFDocument = require('pdfkit-browserify');
const SVGtoPDF = require('svg-to-pdfkit');

// const template = fs.readFileSync(
//   path.resolve(__dirname, "template.svg"),
//   "utf8"
// );

async function ComputeSVG ({ values }) {
  const template = await (fetch('./template.svg').then((response) => response.text()));
  console.log('Computing SVG template with Nunjucks');
  const svg = nunjucks.renderString(template, values);
  console.log('Computing SVG done');
  return { svg };
}

class State {
  constructor () {
    this.svg_ = null;
  }

  SaveSVGToMemory ({ svg }) {
    this.svg_ = svg;
  }

  GetSVGFromMemory () {
    return this.svg_;
  }
}

class UserInterface {
  async RenderPDF ({ pdf = null, blob = null }) {
    assert(pdf !== null || blob !== null);

    if (blob === null) {
      blob = new Blob([pdf], { type: 'application/pdf' });
    }

    document.getElementById('rhs-display-frame').src = URL.createObjectURL(
      blob
    );
  }

  async RenderSVG ({ svg }) {
    console.log('Inserting SVG into display area');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    document.getElementById('lhs-display-frame').src = URL.createObjectURL(
      blob
    );
    console.log('Inserting SVG done');
  }

  GetInputsKeys () {
    return $('#input-table input')
      .toArray()
      .map((element) => {
        const id = $(element).attr('id');
        return id;
      });
  }

  SetInputValuesFromURL () {
    const parsedUrl = new URL(window.location.href);

    console.log(parsedUrl.searchParams);

    for (const key of this.GetInputsKeys()) {
      if (!parsedUrl.searchParams.has(key)) {
        continue;
      }

      let value = parsedUrl.searchParams.get(key);

      console.log(`key: ${key}`);
      const element = document.getElementById(`${key}`);
      console.log(`element: ${element}`);
      if (element.getAttribute('type') === 'number') {
        value = Number.parseFloat(value);
      }

      element.value = value;
    }
  }

  GetSVGInputsFromUI ({ scale = 1.0 } = {}) {
    console.log('Computing template parameters from inputs');

    const values = Object.fromEntries(
      $('#input-table input')
        .toArray()
        .map((element) => {
          const id = $(element).attr('id');
          const value = $(element).val();
          assert($(element).attr('type') === 'number');
          return [id, Number.parseFloat(value)];
        })
    );

    const originalKeys = Object.keys(values);
    for (const [key, value] of Object.entries(values)) {
      values[`${key}Literal`] = value;
    }

    for (const key of originalKeys) {
      values[key] *= scale;
    }
    console.log('Template parameters computed');
    console.log(values);
    return { values };
  }

  SavePDFBlobToFile ({ blob, fname }) {
    FileSaver.saveAs(blob, fname);
  }
}

const state_ = new State();
const ui_ = new UserInterface();

async function RenderFullCoverFromInputs ({ scale = 1.0 } = {}) {
  const { values } = ui_.GetSVGInputsFromUI();
  const { svg } = await ComputeSVG({ values });
  state_.SaveSVGToMemory({ svg });
  await ui_.RenderSVG({ svg: state_.GetSVGFromMemory() });
  const blob = await SaveToPDFBlobWithSVGtoPDFKit({
    svg: state_.GetSVGFromMemory(),
    values: ui_.GetSVGInputsFromUI().values
  });
  await ui_.RenderPDF({ blob });
}

function SaveToSVG (fname) {
  const svgData = state_.GetSVGFromMemory();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
  console.log('svgBlob:', svgBlob);

  FileSaver.saveAs(svgBlob, fname);
}

function CopyToClipboard ({ text }) {
  const copyText = document.getElementById('copy-text');

  copyText.value = text;

  copyText.select();
  copyText.setSelectionRange(0, text.length + 10000);
  document.execCommand('copy');
}

function CopySVGToClipboard () {
  const svgData = state_.GetSVGFromMemory();

  CopyToClipboard({ text: svgData });
}

// function SaveToPDFKendo () {
//   // https://stackoverflow.com/a/46096312/586784
//   assert(false);
// }

// function SaveCanvasToPDF ({ canvas }) {
//   // https://github.com/joshua-gould/canvas2pdf

//   assert(false);
// }

async function SaveToPDFBlobWithSVGtoPDFKit ({ svg, values }) {
  // https://www.npmjs.com/package/svg-to-pdfkit
  console.log('SVGtoPDF:', SVGtoPDF);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      compress: false,
      size: [values.fullWidth * 72, values.fullHeight * 72]
    });

    const stream = doc.pipe(BlobStream());
    stream.on('finish', function () {
      return resolve(stream.toBlob('application/pdf'));
      // console.log(blob);
    });

    SVGtoPDF(
      doc,
      svg,
      /* x= */ 0,
      /* y= */ 0,
      /* options */ {
        precision: 10,
        warningCallback: (args) => {
          console.log(args);
        }
      }
    );
    doc.end();
  });
}

// function SaveSVGToCanvasWithFabricJS ({ svg, canvas }) {
//   assert(false);
// }

// // https://github.com/yWorks/svg2pdf.js/
// function SaveSVGToPDFWithSVG2PDF ({ svg, canvas }) {
//   assert(false);
// }

// async function SaveSVGToCanvasWithCanvas2PDFAndWithCanvg ({ svg }) {
//   const stream = new BlobStream();
//   console.log('canvas2pdf:', canvas2pdf);
//   console.log('PDFDocument:', PDFDocument);
//   const ctx = new canvas2pdf.PdfContext(stream);
//   const v = await Canvg.from(ctx, svg);
//   await v.render();
//   assert(false);
// }

// https://github.com/likr/svg-dataurl
// async function SaveToPDFWithSVGConverter () {
//   assert(false && "This doesn't work.");
//   const svgData = state_.GetSVGFromMemory();

//   assert(false && 'No longer have SVG in element');
//   const converter = await SVGConverter.loadFromElement(
//     document.querySelector('#display-area > svg')
//   );

//   const dataUrl = converter.svgDataURL();
//   const blob = DataURLtoBlob(dataUrl);

//   const text = await blob.text().then();
//   CopyToClipboard({ text });
// }

console.log('Nothing is hooked up; awaiting document ready');

async function Initialize () {
  console.log('Document is ready');

  ui_.SetInputValuesFromURL();

  console.log('Rendering SVG from initial inputs');
  await RenderFullCoverFromInputs();
  console.log('Rendering SVG from initial inputs, done.');

  console.log('Hooking up various event handlers.');
  console.log('Hooking up compute button.');
  // Hook up compute button.
  $('#compute').on('click', async () => {
    console.log('Compute button was clicked.');
    console.log('Rendering SVG from current inputs');
    await RenderFullCoverFromInputs();
    console.log('Rendering SVG from current inputs, done.');
  });
  console.log('Hooking up input box changes.');
  // Hook up input box changes
  $('#input-table input').on('input', () => {
    console.log('Input box has changed.');
    console.log('Clearing the display area.');
    // DO NOT SUBMIT
    // document.getElementById("display-area").innerHTML = "";
    console.log('Display area is clear.');
  });
  console.log('Hooking up save-to-pdf button.');
  // Hook up save-to-pdf.
  // DO NOT SUBMIT: make this a separate function
  $('#save-pdf').on('click', async () => {
    const blob = await SaveToPDFBlobWithSVGtoPDFKit({
      svg: state_.GetSVGFromMemory(),
      values: ui_.GetSVGInputsFromUI().values
    });
    ui_.SavePDFBlobToFile({ blob, fname: 'FullCover.pdf' });
  });

  console.log('Getting rid of "Loading" message.');
  $('#loading').remove();
  console.log('Enabling the compute button.');
  $('#compute').removeAttr('disabled');
  $('#save-pdf').removeAttr('disabled');
  $('#save-svg').removeAttr('disabled');
  $('#copy-svg').removeAttr('disabled');
  $('#special').removeAttr('disabled');
}
console.log('Hooking up save-to-pdf button.');
// Hook up save-to-svg.
$('#save-svg').on('click', () => SaveToSVG('FullCover.svg'));
$('#copy-svg').on('click', () => CopySVGToClipboard());
// $("#special").on("click", async () => {
//   const blob = await SaveToPDFBlobWithSVGtoPDFKit({
//     svg: state_.GetSVGFromMemory(),
//     values: ui_.GetSVGInputsFromUI().values
//   });

//   await ui_.RenderPDF({ blob });
// });

// if (document.readyState === "complete") {
//   initialize();
// } else {
//   $(document).ready(() => initialize());
// }
$(document).ready(async () => Initialize());

// const status = {};
// status.setupState = "none";

// function checkInit() {
//   console.log(
//     `document.readyState: ${document.readyState}, status.setupState: ${status.setupState}`
//   );
//   if (document.readyState === "complete" && status.setupState === "none") {
//     status.setupState = "complete";
//     initialize();
//   } else if (status.setupState === "complete") {
//     // Do nothing.
//   }
// }

// checkInit();

// setInterval(() => {
//   checkInit();
// }, 100);
// window.getSVGData = getSVGData;
