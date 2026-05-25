const LEVEL_1_CONTROLS = [
  {
    key: 'amplitude',
    label: 'Amplitude',
    min: 0,
    max: 0.08,
    step: 0.001,
    format: (value) => value.toFixed(3),
  },
  {
    key: 'frequency',
    label: 'Frequency',
    min: 3,
    max: 16,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'speed',
    label: 'Speed',
    min: 0.4,
    max: 4.5,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'octaves',
    label: 'Octaves',
    min: 1,
    max: 5,
    step: 1,
    format: (value) => String(Math.round(value)),
  },
  {
    key: 'morphRadius',
    label: 'Morph',
    min: 0.1,
    max: 1.6,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
];

const REFLECTION_CONTROLS = [
  {
    key: 'strength',
    label: 'Strength',
    min: 0,
    max: 1.6,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'shininess',
    label: 'Shininess',
    min: 24,
    max: 220,
    step: 1,
    format: (value) => String(Math.round(value)),
  },
  {
    key: 'spread',
    label: 'Spread',
    min: 0.08,
    max: 0.65,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
];

const SLOPE_SHADING_CONTROLS = [
  {
    key: 'lightStrength',
    label: 'Light Side',
    min: 0,
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'shadowStrength',
    label: 'Dark Side',
    min: 0,
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'normalBoost',
    label: 'Slope Boost',
    min: 1,
    max: 18,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
];

const NORMAL_CONTROLS = [
  {
    key: 'level1Strength',
    label: 'Ripple Normal',
    min: 0,
    max: 1.8,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'sampleStep',
    label: 'Sample Step',
    min: 0.02,
    max: 0.12,
    step: 0.005,
    format: (value) => value.toFixed(3),
  },
  {
    key: 'maxSlope',
    label: 'Slope Limit',
    min: 0.3,
    max: 2.2,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
];

const LEVEL_2_CONTROLS = [
  {
    key: 'amplitude',
    label: 'Amplitude',
    min: 0,
    max: 0.35,
    step: 0.005,
    format: (value) => value.toFixed(3),
  },
  {
    key: 'wavelength',
    label: 'Base Length',
    min: 1.2,
    max: 7,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'speed',
    label: 'Speed',
    min: 0,
    max: 1.8,
    step: 0.02,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'directionDegrees',
    label: 'Direction',
    min: -180,
    max: 180,
    step: 1,
    format: (value) => `${Math.round(value)} deg`,
  },
  {
    key: 'secondaryStrength',
    label: 'Layer Mix',
    min: 0,
    max: 0.8,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'noiseStrength',
    label: 'Phase Warp',
    min: 0,
    max: 0.7,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'steepness',
    label: 'Steepness',
    min: 0,
    max: 0.9,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
];

export function createWaterTuningMenu({ params, presets, initialPreset }) {
  const level1 = params.waves.level1;
  const level2 = params.waves.level2;
  const reflection = params.sunReflection;
  const slopeShading = params.slopeShading;
  const normalBlending = params.normalBlending;
  const panel = document.createElement('section');
  const toggleButton = document.createElement('button');
  const presetButtons = new Map();
  const inputByKey = new Map();
  const valueByKey = new Map();

  panel.className = 'tuning-panel';
  panel.id = 'water-tuning-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="tuning-header">
      <h1>Level 1 Noise</h1>
      <button class="tuning-close-button" type="button" aria-label="Close water settings">Close</button>
    </div>
    <div class="preset-row" aria-label="Level 1 noise presets"></div>
    <div class="control-list" data-control-group="level1"></div>
    <div class="tuning-header tuning-header-secondary">
      <h1>Level 2 Waves</h1>
    </div>
    <div class="control-list" data-control-group="level2"></div>
    <div class="tuning-header tuning-header-secondary">
      <h1>Sun Reflection</h1>
    </div>
    <div class="control-list" data-control-group="reflection"></div>
    <div class="tuning-header tuning-header-secondary">
      <h1>Slope Shading</h1>
    </div>
    <div class="control-list" data-control-group="slope"></div>
    <div class="tuning-header tuning-header-secondary">
      <h1>Wave Normals</h1>
    </div>
    <div class="control-list" data-control-group="normals"></div>
  `;

  toggleButton.className = 'tuning-fab';
  toggleButton.type = 'button';
  toggleButton.textContent = 'Settings';
  toggleButton.setAttribute('aria-controls', panel.id);
  toggleButton.setAttribute('aria-expanded', 'false');

  const closeButton = panel.querySelector('.tuning-close-button');
  const presetRow = panel.querySelector('.preset-row');
  const level1ControlList = panel.querySelector('[data-control-group="level1"]');
  const level2ControlList = panel.querySelector('[data-control-group="level2"]');
  const reflectionControlList = panel.querySelector(
    '[data-control-group="reflection"]',
  );
  const slopeControlList = panel.querySelector('[data-control-group="slope"]');
  const normalControlList = panel.querySelector(
    '[data-control-group="normals"]',
  );

  Object.entries(presets).forEach(([key, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.label;
    button.className = 'preset-button';
    button.addEventListener('click', () => {
      applyPreset(key);
    });
    presetButtons.set(key, button);
    presetRow.append(button);
  });

  LEVEL_1_CONTROLS.forEach((control) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    const input = document.createElement('input');

    row.className = 'control-row';
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = level1[control.key];
    value.textContent = control.format(level1[control.key]);

    input.addEventListener('input', () => {
      const nextValue =
        control.key === 'octaves'
          ? Math.round(Number(input.value))
          : Number(input.value);
      level1[control.key] = nextValue;
      value.textContent = control.format(nextValue);
      setActivePreset(null);
    });

    row.append(control.label, input, value);
    inputByKey.set(control.key, input);
    valueByKey.set(control.key, value);
    level1ControlList.append(row);
  });

  LEVEL_2_CONTROLS.forEach((control) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    const input = document.createElement('input');

    row.className = 'control-row';
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = level2[control.key];
    value.textContent = control.format(level2[control.key]);

    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      level2[control.key] = nextValue;
      value.textContent = control.format(nextValue);
    });

    row.append(control.label, input, value);
    level2ControlList.append(row);
  });

  REFLECTION_CONTROLS.forEach((control) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    const input = document.createElement('input');

    row.className = 'control-row';
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = reflection[control.key];
    value.textContent = control.format(reflection[control.key]);

    input.addEventListener('input', () => {
      const nextValue =
        control.key === 'shininess'
          ? Math.round(Number(input.value))
          : Number(input.value);
      reflection[control.key] = nextValue;
      value.textContent = control.format(nextValue);
    });

    row.append(control.label, input, value);
    reflectionControlList.append(row);
  });

  SLOPE_SHADING_CONTROLS.forEach((control) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    const input = document.createElement('input');

    row.className = 'control-row';
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = slopeShading[control.key];
    value.textContent = control.format(slopeShading[control.key]);

    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      slopeShading[control.key] = nextValue;
      value.textContent = control.format(nextValue);
    });

    row.append(control.label, input, value);
    slopeControlList.append(row);
  });

  NORMAL_CONTROLS.forEach((control) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    const input = document.createElement('input');

    row.className = 'control-row';
    input.type = 'range';
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = normalBlending[control.key];
    value.textContent = control.format(normalBlending[control.key]);

    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      normalBlending[control.key] = nextValue;
      value.textContent = control.format(nextValue);
    });

    row.append(control.label, input, value);
    normalControlList.append(row);
  });

  document.body.append(toggleButton, panel);
  applyPreset(initialPreset);

  toggleButton.addEventListener('click', () => {
    setExpanded(panel.hidden);
  });

  closeButton.addEventListener('click', () => {
    setExpanded(false);
  });

  function applyPreset(key) {
    const preset = presets[key];
    Object.entries(preset.values).forEach(([paramKey, paramValue]) => {
      level1[paramKey] = paramValue;
    });
    syncControls();
    setActivePreset(key);
  }

  function syncControls() {
    LEVEL_1_CONTROLS.forEach((control) => {
      const input = inputByKey.get(control.key);
      const value = valueByKey.get(control.key);
      input.value = level1[control.key];
      value.textContent = control.format(level1[control.key]);
    });
  }

  function setActivePreset(activeKey) {
    presetButtons.forEach((button, key) => {
      button.classList.toggle('is-active', key === activeKey);
    });
  }

  function setExpanded(isExpanded) {
    panel.hidden = !isExpanded;
    toggleButton.hidden = isExpanded;
    toggleButton.setAttribute('aria-expanded', String(isExpanded));
  }
}
