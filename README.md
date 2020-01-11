- [Introduction](#introduction)
- [Dependencies](#dependencies)
- [Structure](#structure)
    - [控制层](#%e6%8e%a7%e5%88%b6%e5%b1%82)
    - [策略层](#%e7%ad%96%e7%95%a5%e5%b1%82)
    - [硬件层](#%e7%a1%ac%e4%bb%b6%e5%b1%82)
    - [系统](#%e7%b3%bb%e7%bb%9f)
- [Todo](#todo)

# Introduction

Codes in this repository is deployed to Nano dev board.
This sub-project serves to define the control strategy for the robot.

# Dependencies

```powershell
pip install pynetworktables
pip install schema
pip install bokeh
pip3 install torch==1.3.1+cpu torchvision==0.4.2+cpu -f https://download.pytorch.org/whl/torch_stable.html
```

# Structure

### 控制层

- UI 界面，用户交互

### 策略层

- 控制算法

### 硬件层

- 向 Roborio 发送指令

### 系统

- 占用管理、优先级策略。
- WEB Dashboard

# Todo

| task                   | coffee days | field days |
| ---------------------- | :---------: | :--------: |
| 底盘控制测试           |      1      |     1      |
| 电机测试模块           |     0.5     |    0.5     |
| 方框图，数据缓存显示   |      2      |     0      |
| 所有机器部件的控制模块 |      0      |     2      |
| 基本的算法和策略       |      5      |     10     |
| 计算机视觉部分         |      5      |     10     |

- Websocket
- 控制能动
- config 工作的
- 一个用来测试电机的 module 0.5+0.5
- Benchmark 方框图+数据的缓存和显示 2+0
  - python 不管连接，只管 raw data
  - 实时/最后
- 4W 吃进每一个配件，写 module, mapping 通过 config 0+2
- CV inf+inf (与刘宏逸同吃同睡)
  - （双目）图像定位 3
  - 找球
  - 瞄准 发射模块
  - 转盘模块
  - 杠杆的平衡调整