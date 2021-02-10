import "./Controls.css";
import "react-image-crop/dist/ReactCrop.css";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop from "react-image-crop";

const Marvin = window.Marvin;
const MarvinImage = window.MarvinImage;

const aspect_ratios = {
  // 30 characters wide, 500 characters total
  // keeping in mind that a Braille pattern symbol is 2x4 dots,
  // that would result in an image of 60x64 pixels
  twitch: [60, 64],
  // same width, but only 200 characters
  youtube: [60, 24],
  custom: [],
};

const FilePicker = (props) => {
  const { settings, setSettings } = props;

  const onChange = (e) => {
    const files = e.target.files;
    if (files.length !== 0) {
      setSettings({ ...settings, path: files[0] });
    }
  };

  return (
    <div>
      <label htmlFor="file">Picture file: </label>
      <input
        id="file"
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e)}
      />
    </div>
  );
};

const Settings = (props) => {
  const { settings, setSettings } = props;
  const { setRawData } = props;
  const [img, setImg] = useState(null);
  // since I only want to track the changes of settings
  // I use refs in order to preserve images across lifecycles
  const imgRef = useRef(null);
  const onLoad = useCallback((img) => {
    imgRef.current = img;
  }, []);
  const previewCanvasRef = settings.previewCanvasRef;
  const [crop, setCrop] = useState({});
  useEffect(() => {
    setCrop({ aspect: settings.aspect });
  }, [settings.aspect]);

  const [completedCrop, setCompletedCrop] = useState(null);
  const onCropCompleted = () => {
    if (!settings.configured) {
      setSettings({ ...settings, configured: true });
    }
  };
  const [type, setType] = useState(Object.keys(aspect_ratios)[0]);

  const cropImage = (image, canvas, crop) => {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
  };

  const convertedThreshold = () => {
    return Math.floor(settings.threshold * 2.55);
  };

  const cutDownSide = (side, to) => {
    return parseInt(side - (side % to));
  };

  // here's the main entry point where all image processing happens
  useEffect(() => {
    if (
      !completedCrop ||
      !previewCanvasRef.current ||
      !imgRef.current ||
      !settings.configured ||
      !completedCrop.width ||
      !completedCrop.height
    ) {
      return;
    }
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;
    if (!crop.width || !crop.height) {
      // the crop is effectively empty, nothing to process
      return;
    }
    cropImage(image, canvas, crop);
    let tempIn = new MarvinImage();
    let tempOut = new MarvinImage();

    const canvasData = canvas.toDataURL();
    tempIn.load(canvasData, () => {
      // this whole part is kinda ugly I admit it, but it takes time to sort
      // things out and write it neatly when there's no api docs at all, so I'm
      // not investing that time nether into this library in particular nor into
      // this project in whole.
      tempOut = tempIn.clone();
      Marvin.grayScale(tempIn, tempOut);
      if (settings.detectEdges) {
        tempIn = tempOut.clone();
        Marvin.prewitt(tempIn, tempOut);
      }
      if (settings.invertColors) {
        tempIn = tempOut.clone();
        Marvin.invertColors(tempIn, tempOut);
      }
      tempIn = tempOut.clone();
      Marvin.thresholding(tempIn, tempOut, convertedThreshold());
      tempOut.draw(canvas);
      let width, height;
      if (type === "custom") {
        // because Braille patter symbols are of size 2x4,
        // width and height should be an integer multiply of
        // 2 and 4 respectively
        width = cutDownSide(completedCrop.width, 2);
        height = cutDownSide(completedCrop.height, 4);
      } else {
        width = aspect_ratios[type][0];
        height = aspect_ratios[type][1];
      }
      let result = new MarvinImage();
      Marvin.scale(tempOut, result, width, height);
      setRawData(result.imageData);
    });
    // eslint-disable-next-line
  }, [completedCrop, previewCanvasRef, settings]);

  useEffect(() => {
    if (settings.path) {
      let reader = new FileReader();
      reader.addEventListener("load", () => setImg(reader.result));
      reader.readAsDataURL(settings.path);
    }
  }, [settings.path]);

  if (!settings.path) {
    return null;
  }

  const onTypeChange = (e) => {
    const type = e.target.value;
    setType(type);
    const value = aspect_ratios[type];
    const aspect = value.length !== 0 ? value[0] / value[1] : null;
    setSettings({ ...settings, aspect, configured: !settings.configured });
    // in order to prevent rendering the same
    // crop twice on preset change event
    setCompletedCrop({});
  };

  const onThresholdChange = (e) => {
    const value = parseInt(e.target.value);
    setSettings({ ...settings, threshold: value });
  };

  const onEdgeChange = (e) => {
    const detectEdges = e.target.checked;
    setSettings({ ...settings, detectEdges });
  };

  const onInvertChange = (e) => {
    const invertColors = e.target.checked;
    setSettings({ ...settings, invertColors });
  };

  // doing it in an explicit way in order to be able to add other
  // presets just by extending `aspect_ratios` object
  const variants = [];
  for (let type in aspect_ratios) {
    variants.push(
      <label key={`${type}_label`} htmlFor={type}>
        <input
          id={type}
          type="radio"
          value={type}
          name="type"
          defaultChecked={type === Object.keys(aspect_ratios)[0]}
          onChange={(e) => onTypeChange(e)}
        />{" "}
        {type}{" "}
      </label>
    );
  }

  return (
    <form id="settings">
      <fieldset id="settings-fieldset">
        <legend>Settings</legend>
        {variants}
        <br />
        <label htmlFor="threshold">Threshold [1-99]: </label>
        <input
          key="threshold"
          id="threshold"
          type="number"
          name="threshold"
          min="1"
          max="99"
          defaultValue={settings.threshold}
          onChange={(e) => onThresholdChange(e)}
        />
        <label htmlFor="edge">
          <input
            key="edge"
            id="edge"
            type="checkbox"
            name="edge"
            defaultValue={settings.detectEdges}
            onChange={(e) => onEdgeChange(e)}
          />
          Detect edges
        </label>
        <label htmlFor="invert">
          <input
            key="invert"
            id="invert"
            type="checkbox"
            name="invert"
            defaultValue={settings.invertColors}
            onChange={(e) => onInvertChange(e)}
          />
          Invert colors
        </label>
      </fieldset>
      <div className="crop">
        <p>Crop</p>
        <ReactCrop
          src={img}
          crop={crop}
          onImageLoaded={onLoad}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          onDragEnd={() => onCropCompleted()}
        />
      </div>
    </form>
  );
};

const Preview = (props) => {
  const settings = props.settings;
  if (!settings.configured) {
    return null;
  }
  return (
    <div className="preview">
      <p>Preview</p>
      <canvas ref={settings.previewCanvasRef} />
    </div>
  );
};

const Result = (props) => {
  const rawData = props.rawData;
  if (!rawData) {
    return null;
  }

  const width = rawData.width;
  const height = rawData.height;

  const at = (x, y) => {
    const index = y * (width * 4) + x * 4;
    const pixel = rawData.data[index];
    return pixel ? 0 : 1;
  };

  const getSymbolAt = (i, j) => {
    const code =
      at(i, j) * 1 +
      at(i, j + 1) * 2 +
      at(i, j + 2) * 4 +
      at(i + 1, j) * 8 +
      at(i + 1, j + 1) * 16 +
      at(i + 1, j + 2) * 32 +
      at(i, j + 3) * 64 +
      at(i + 1, j + 3) * 128 +
      0x2800;
    return String.fromCharCode(code);
  };

  let rows = [];
  for (let y = 0; y <= height - 1; y += 4) {
    let line = "";
    for (let x = 0; x <= width - 1; x += 2) {
      line += getSymbolAt(x, y);
    }
    rows.push(
      <pre key={y}>
        {line}
        <br />
      </pre>
    );
  }

  return (
    <div className="result">
      <pre>{rows}</pre>
    </div>
  );
};

const Controls = () => {
  let aspect = Object.values(aspect_ratios)[0];
  aspect = aspect[0] / aspect[1];
  const previewCanvasRef = useRef(null);
  // global state object that gets propagated everywhere
  const [settings, setSettings] = useState({
    path: null,
    aspect,
    threshold: 50,
    detectEdges: false,
    invertColors: false,
    previewCanvasRef,
    configured: false,
  });

  const [rawData, setRawData] = useState(null);

  return (
    <div className="Controls">
      <FilePicker settings={settings} setSettings={setSettings} />
      <Settings
        settings={settings}
        setSettings={setSettings}
        setRawData={setRawData}
      />
      <Preview settings={settings} />
      <Result rawData={rawData} />
    </div>
  );
};

export { Controls };
