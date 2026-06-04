/* Shared project data — sourced by the projects/*.html detail pages. */

window.PROJECT_ORDER = [
  'imitation-arm',
  'uas-detection',
  'minecraft-rl',
  'iot-smarthome'
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
  }
};
