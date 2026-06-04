// Project metadata surfaced in the focus panel.
// `id` matches the interactive object key in buildObjects.js.
// Add a new entry here + a matching object to expand the room.

export const PROJECTS = {
  'imitation-arm': {
    title: 'ImitationArm',
    type: 'Robotics · Hardware',
    accent: '#6c63ff',
    tag: 'robotic arm',
    blurb: 'A 6-DOF robotic arm that grasps small objects, teleoperated from a custom glove or keyboard.',
    highlights: [
      'ROS2 control stack with MoveIt2 trajectory planning',
      'Gradient-descent inverse kinematics maps (x,y,z) → servo angles',
      'Wearable ESP32 + MPU-6050 controller streams motion over MQTT',
      'MuJoCo sim environments for reinforcement learning',
    ],
    stack: ['ROS2', 'MoveIt2', 'ESP32', 'IMU', 'Inverse Kinematics', 'MQTT', 'Python'],
    detail: 'projects/imitation-arm.html',
    github: 'https://github.com/andrearante12/ros2_ws',
  },
  'minecraft-rl': {
    title: 'Minecraft Parkour RL',
    type: 'Reinforcement Learning · Simulation',
    accent: '#f5a623',
    tag: 'screen',
    blurb: 'A modular framework on top of Project Malmo for training RL agents in fully customizable Minecraft environments.',
    highlights: [
      'Imitation-learning pipeline records expert demos by just playing',
      'PPO w/ GAE Estimation for additional finetuning',
      'Curriculum learning: easy jumps → multi-block gaps → vertical jumps → zero-shot generalization on full courses',
      'Parallel training across N simultaneous environments',
    ],
    stack: ['PPO', 'PyTorch', 'Microsoft Malmo', 'Curriculum Learning', 'Python', 'Java'],
    detail: 'projects/minecraft-rl.html',
    github: 'https://github.com/andrearante12/Minecraft-Reinforcement-Learning',
  },
  'picrawler': {
    title: 'PiCrawler VLM Search',
    type: 'Robotics · Embedded',
    accent: '#00d4aa',
    tag: 'crawler robot',
    blurb: 'A VLM-driven search quadruped: the operator gives a natural-language task ("find the blue backpack") and a workstation VLM reasons over the robot’s camera stream to drive it there.',
    highlights: [
      'Natural-language goals: a workstation VLM reasons over the live camera feed and issues discrete movement commands',
      'Pi runs as a thin client — all heavy compute (VLM, perception, planning) lives on a centralized command center',
      'Split transport: UDP for lossy telemetry (camera, ultrasonic), TCP for guaranteed command delivery',
      'Independent on-Pi safety loop (10+ Hz): ultrasonic emergency-stop and 1 s command-timeout failsafe, holds even if WiFi drops',
    ],
    stack: ['ROS 2 Jazzy', 'VLM', 'Raspberry Pi', 'Pi Camera', 'UDP / TCP', 'Python'],
    detail: 'https://github.com/andrearante12/crawler_ws',
    github: 'https://github.com/andrearante12/crawler_ws',
    docs: 'https://docs.sunfounder.com/projects/pi-crawler/en/latest/',
  },
  'iot-smarthome': {
    title: 'IoT Smart Home',
    type: 'Embedded · Hardware',
    accent: '#34d399',
    tag: 'smart device',
    app: 'lumina',
    blurb: 'A fully local Raspberry Pi smart-home hub controlling Zigbee lights by voice, physical switch, and the LUMINA phone app — no cloud. Tap the phone on the desk to open the app and control this room\u2019s lights for real.',
    highlights: [
      'Three parallel control modes: voice (Vosk), switches, phone app',
      'Zigbee-to-MQTT bridge via zigbee2mqtt',
      'Fully offline & private, all processing on happens on a RaspberryPi',
    ],
    stack: ['Raspberry Pi', 'MQTT', 'Zigbee', 'Vosk', 'Python'],
    detail: 'projects/iot-smarthome.html',
    github: 'https://github.com/andrearante12/IoT-Smart-Home-Network',
  },
  'uas-detection': {
    title: 'UAS Landing Zone Detection',
    type: 'Research · Computer Vision',
    accent: '#5b9dff',
    tag: 'drone',
    blurb: 'Autonomous package-delivery drones that detect a safe drop zone and place packages right in a person\u2019s front yard — open-vocabulary obstruction detection for last-meter UAS delivery. Ongoing research project at IASL lab at GWU',
    highlights: [
      'Fine-tuned YOLO-World for open-vocabulary landing-zone obstruction detection',
      'Real-time onboard inference for safe drop-zone selection',
      'Bird\u2019s-eye perception pipeline for last-meter package delivery',
      'Research toward fully autonomous front-yard delivery',
    ],
    stack: ['YOLO-World', 'PyTorch', 'CV', 'UAS', 'Jetson', 'Python'],
    detail: 'https://andrearante12.github.io/andre.dev/projects/uas-detection.html',
    github: 'https://andrearante12.github.io/andre.dev/projects/uas-detection.html',
  },
  'vgc': {
    title: 'VGC Teambuilder Agent',
    titleSize: '28px',
    type: 'Reinforcement Learning · Research',
    accent: '#e3504a',
    tag: 'switch',
    blurb: 'A Pokémon VGC teambuilding agent built on VGC-Bench — a benchmark that solved battling agents but left team construction open. It uses PSRO (Policy-Space Response Oracles) to build Gen 9 doubles teams that beat the current meta, shown battling live on the Switch.',
    highlights: [
      'Extends VGC-Bench (which fixed battle policy but left team construction open) to learn the teambuilding half',
      'Builds teams with PSRO — iterative best-response + population play converging toward Nash-equilibrium teams vs. the meta',
      'Two modes: a GPU-free evolutionary search and an RL SP-PSRO policy that generates teams autoregressively (REINFORCE)',
      'Targets Regulation I "Limit Two Restricted" — evaluated against 739 real tournament teams and the top Miraidon / Calyrex / Koraidon cores',
      'Win-rate optimized over meta team pools; battles run on a local Pok\u00e9mon Showdown server',
    ],
    stack: ['PyTorch', 'PSRO', 'Self-Play RL', 'VGC-Bench', 'Poke-env', 'Showdown', 'Python'],
    detail: 'https://github.com/andrearante12/vgc-bench/blob/feature/team_building/docs/team_builder/README.md',
    github: 'https://github.com/andrearante12/vgc-bench',
  },
};

// Order used by the hotspot list / keyboard cycling.
export const PROJECT_ORDER = ['imitation-arm', 'minecraft-rl', 'picrawler', 'iot-smarthome', 'vgc'];
