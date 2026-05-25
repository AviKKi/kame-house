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

export function createWaterTuningMenu({ params, presets, initialPreset }) {
  const level1 = params.waves.level1;
  const panel = document.createElement('section');
  const presetButtons = new Map();
  const inputByKey = new Map();
  const valueByKey = new Map();

  panel.className = 'tuning-panel';
  panel.innerHTML = `
    <div class="tuning-header">
      <h1>Level 1 Noise</h1>
    </div>
    <div class="preset-row" aria-label="Level 1 noise presets"></div>
    <div class="control-list"></div>
  `;

  const presetRow = panel.querySelector('.preset-row');
  const controlList = panel.querySelector('.control-list');

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
    controlList.append(row);
  });

  document.body.append(panel);
  applyPreset(initialPreset);

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
}
