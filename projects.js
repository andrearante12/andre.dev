/* Shared project data — sourced by index.html (grid) and projects/*.html (detail pages). */

window.PROJECT_ORDER = [
  'imitation-arm',
  'uas-detection',
  'minecraft-rl',
  'pokemon-battle',
  'opencda',
  'rl-gymnasium',
  'iot-smarthome',
  'wildfire'
];

window.PROJECTS = {
  'imitation-arm': {
    title: 'ImitationArm',
    type: 'Robotics · Hardware',
    accent: '#6c63ff',
    github: 'https://github.com/andrearante12/ros2_ws',
    description: [
      'A 6-DOF robotic arm that learns manipulation skills by watching human demonstrations via Imitation Learning and Behavioral Cloning.',
      'The full control stack on ROS2 Jazzy, integrating motion planning, trajectory execution, IMU signal processing, and low-level microcontroller communication over serial and wireless communication.'
    ],
    highlights: [
      'Wearable IMU controller (ESP32 + MPU-6050) streams motion data over WiFi/MQTT in real time',
      'Custom inverse kinematics via gradient descent converts (x, y, z) targets to servo angles',
      'MoveIt2 handles trajectory planning and collision detection before executing any motion',
      'Six MG996R PWM servos driven by a PCA9685 16-channel PWM controller over I2C',
      'Vision-assisted calibration and full imitation learning pipeline in active development'
    ],
    stack: ['ROS2 Jazzy','MoveIt2','ESP32','MPU-6050','MQTT','Python','Arduino','SolidWorks','MuJuCo','I2C/Serial'],
    media: [
      { src: 'videos/robotic_arm_sim.mov', label: 'Pick and place demo in MuJuCo simulator' },
      { src: 'videos/robotic_arm_battery.mov', label: 'Pick and place demo of Battery' },
      { src: 'videos/wearable_controller.mov', label: 'Demo of Wearable Controller Teleoperation' }
    ]
  },
  'uas-detection': {
    title: 'UAS Landing Zone Detection',
    type: 'Research · Computer Vision',
    accent: '#00d4aa',
    github: 'https://github.com/andrearante12/FineTune-YOLOW-UAS',
    description: [
      'Research project at GWU\'s IASL lab. Fine-tunes YOLO-World for real-time obstruction detection on UAS landing zones, enabling safe autonomous drone package delivery.',
      'The key advantage: open-vocabulary zero-shot generalization. New obstacle types (a bicycle, a person, debris) can be queried at inference time with natural language, requiring no retraining.'
    ],
    highlights: [
      'Fine-tuned on the VisDrone dataset, optimizing detection from a bird\'s-eye-view perspective',
      'Conducted experiments on the tradeoff between finetuning for domain specific accuracy vs open vocabulary retention',
      'Deployed on NVIDIA Jetson Xavier and NVIDIA Jetson Orin Nano for real-time edge inference',
      'Research paper submission in progress for AIAA Scitech 2027: Open-Vocabulary UAS Landing Zone Obstruction Detection via Fine-Tuned YOLO-World'
    ],
    stack: ['YOLO-World','MMCV','PyTorch','CLIP','Jetson Xavier','VisDrone','Python','CUDA'],
    media: [
      { src: 'videos/yoloworld_demo.mp4', label: 'Finetuned version, retaining open-vocab capabilities' }
    ]
  },
  'minecraft-rl': {
    title: 'Minecraft Parkour RL',
    type: 'Reinforcement Learning · Simulation',
    accent: '#f5a623',
    github: 'https://github.com/andrearante12/Minecraft-Reinforcement-Learning',
    description: [
      'A modular framework built on top of Project Malmo, an open source minecraft simulator to support training of Reinforcement Learning based agents in completely customizeable enviornments for specialized tasks.',
      'Demo includes an agent trained to complete Minecraft parkour courses, and an agent trained to bridge (build) in order to traverse open gaps.'
    ],
    highlights: [
      'Full PPO implementation from scratch — pure PyTorch, no RL library dependencies as well as options for SB3 training loops',
      'Imitation Learning pipeline for recording expert trajectories simpily by playing Minecraft normally',
      'Fully customizeable curriculum learning roadmap: (Parkour example: flat gaps → multi-block gaps → angled landings → complex courses)'
    ],
    stack: ['PPO','PyTorch','Microsoft Malmo','Python','TCP Sockets','Curriculum Learning','Java'],
    media: [
      { src: 'videos/n_envs_demo.mp4', label: 'Parallel training is possible with n enviornments' },
      { src: 'videos/90%_success_one_block_jump.mp4', label: 'Succesful parkour episode (1 block gap)' },
      { src: 'videos/successful_diagonal_bridge.mp4', label: 'Succesful bridging episode (diagonal)' }
    ]
  },
  'wildfire': {
    title: 'Wildfire Early Detection',
    type: 'Computer Vision · Classification',
    accent: '#ff6b6b',
    github: 'https://github.com/andrearante12/Wildfire-Classification',
    description: [
      'A YOLO-based computer vision model trained to detect early signs of wildfire, such as smoke plumes and flame signatures, in ground-level imagery taken from early detection outposts across California.',
      'Early fire detection from AlertCalifornia live feeds can give emergency services critical lead time.'
    ],
    highlights: [
      'Classifies both smoke (early-stage) and active flame'
    ],
    stack: ['YOLOv8','Python','Roboflow','PyTorch','OpenCV','TensorFlow'],
    media: [
      { src: 'images/wildfire.png', label: 'Finetuned classifier capable of detecting fire' }
    ]
  },
  'opencda': {
    title: 'OpenCDA Merging',
    type: 'Simulation · Autonomous Vehicles',
    accent: '#00d4aa',
    github: 'https://github.com/andrearante12/OpenCDA-Merging',
    description: [
      'A cooperative driving automation framework on top of CARLA (physics/rendering) and SUMO (traffic flow), using OpenCDA as the middleware layer for multi-agent vehicle coordination.'
    ],
    highlights: [
      'Built test environments integrating CARLA and SUMO for realistic urban/highway traffic',
      'Custom merging behavior policies for cooperative vs. non-cooperative agent comparison',
      'Part of ongoing GWU IASL research on safe autonomous driving systems'
    ],
    stack: ['CARLA','SUMO','OpenCDA','Python','Multi-agent Systems'],
    media: [
      { src: 'videos/Highway_Merging.mp4', label: 'Demo of autonomous vehicle merging into a congested highway network' }
    ]
  },
  'rl-gymnasium': {
    title: 'RL Gymnasium Agents',
    type: 'RL · Simulation',
    accent: '#a78bfa',
    github: 'https://github.com/andrearante12/RL_Gymnasium',
    description: [
      'PPO-based agents trained across three Gymnasium environments — CarRacing-v3, LunarLander-v3, and Humanoid-v5. Each environment demanded a distinct set of design decisions to push evaluation scores to competitive levels.',
      'Key techniques: discretized action space and multi-channel frame stacking for CarRacing, physics domain randomization for LunarLander, and a custom pose perturbation wrapper for Humanoid that prevents overfitting to clean episode starts.'
    ],
    highlights: [
      'CarRacing-v3: discrete 5-action space, 84×84 grayscale frame stacking (4 frames), reward shaping for speed, grass penalty, and smoothness → 927 / 831 eval scores',
      'LunarLander-v3: domain randomization over gravity [−11, −9], wind power [10, 20], and turbulence [1, 2] forces generalization across physics conditions',
      'Humanoid-v5: AwkwardStartWrapper randomizes starting pose (crouch, tilt, joint noise, velocity noise) on 85% of training episodes; clean starts at eval time',
      'All agents finetuned from saved checkpoints with linear LR decay to prevent late-stage performance regression',
      'Humanoid uses a 348-dim observation space, 17-dim continuous action space, and a 256×256 MLP actor-critic with VecNormalize'
    ],
    stack: ['PPO', 'Gymnasium', 'Stable-Baselines3', 'PyTorch', 'VecNormalize', 'Python'],
    media: [
      { src: 'videos/testcase0.gif', label: 'Car Racing Demo' },
      { src: 'videos/humanoid_0.gif', label: 'Humanoid Demo' }
    ]
  },
  'iot-smarthome': {
    title: 'IoT Smart Home Network',
    type: 'IoT · Hardware',
    accent: '#34d399',
    github: 'https://github.com/andrearante12/IoT-Smart-Home-Network',
    description: [
      'A Raspberry Pi-based smart home network for remote control of smart lights through three interfaces: voice activation, physical switches, and a browser-based web UI — all running on local hardware.',
      'Zigbee devices communicate over MQTT via zigbee2mqtt. Voice commands are processed locally using the Vosk speech recognition toolkit, keeping the system fully offline with no cloud dependencies.'
    ],
    highlights: [
      'Three control modes operating in parallel: voice (Vosk), manual switches, and web interface',
      'Zigbee-to-MQTT bridge via zigbee2mqtt for reliable smart light state management',
      'Fully local stack — no cloud APIs, all processing on Raspberry Pi',
      'Python backend handles command routing; HTML/JS frontend serves the web control panel'
    ],
    stack: ['Raspberry Pi', 'MQTT', 'Zigbee', 'Vosk', 'Python', 'HTML/JS', 'zigbee2mqtt'],
    media: [
      { label: 'Web control interface', hint: 'image or video', icon: '◻' },
      { label: 'Hardware setup', hint: 'image', icon: '◻' }
    ]
  },
  'pokemon-battle': {
    title: 'Pokémon Miniconsole',
    type: 'Embedded Systems · C',
    accent: '#facc15',
    github: 'https://github.com/andrearante12/Pokemon_on_Tivaware',
    description: [
      'A fully playable Pokémon turn-based battle game running on a TI Tiva C (TM4C123) microcontroller. The game renders ASCII art battle sprites and menus directly into a host terminal over UART using ANSI escape sequences for efficient partial-screen updates — no full redraws.',
      'Music is handled by a non-blocking Timer0 ISR that toggles a speaker pin at note frequency while the main loop runs game logic. A custom Python script converts MIDI files into C arrays the firmware plays back directly, reducing chords to a single melody line the single-channel speaker can reproduce.'
    ],
    highlights: [
      'ANSI escape sequences reposition the cursor mid-frame so only changed cells are retransmitted (zero full-screen redraws)',
      'Four Pokémon songs (Black/White, Red/Blue, Center Theme, X/Y) encoded as (note, duration) C arrays via midi_to_c.py',
      'Timer0 ISR handles both pin toggling and song sequencing, keeping audio fully non-blocking',
      'HW-504 two-axis joystick read over ADC0 with dead-zone filtering (thresholds 800 / 3200 out of 4095) and held-input lockout',
      'Two-sample 20 ms debounce on SW1/SW2 for reliable button presses; joystick push-button mutes audio',
      'ASCII sprite assets for Bulbasaur and Squirtle stored in .h header files, generated from PNG via online converter'
    ],
    stack: ['C', 'TI TM4C123', 'TivaWare SDK', 'UART', 'ADC', 'Timer ISR', 'GPIO', 'ANSI Escapes', 'Python', 'MIDI'],
    media: [
      { src: 'videos/pokemon_miniconsole_demo_video.mov', label: 'Realtime Demo' },
      { src: 'images/battle_game_demo.png', label: 'Terminal capture — ASCII art battle scene' }
    ]
  }
};
