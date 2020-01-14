- [Introduction](#introduction)
- [Dependencies](#dependencies)
- [Structure](#structure)
    - [控制层](#%e6%8e%a7%e5%88%b6%e5%b1%82)
    - [策略层](#%e7%ad%96%e7%95%a5%e5%b1%82)
    - [硬件层](#%e7%a1%ac%e4%bb%b6%e5%b1%82)
    - [系统](#%e7%b3%bb%e7%bb%9f)
- [Todo](#todo)
- [Jetson Nano的调试](#jetson-nano%e7%9a%84%e8%b0%83%e8%af%95)
    - [基本信息](#%e5%9f%ba%e6%9c%ac%e4%bf%a1%e6%81%af)
    - [Commands Setup](#commands-setup)
- [NANO REPO](#nano-repo)
    - [问题](#%e9%97%ae%e9%a2%98)
    - [步骤](#%e6%ad%a5%e9%aa%a4)
    - [linux cmd note](#linux-cmd-note)

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



# Jetson Nano的调试

### 基本信息
系统架构：`ARM x64`

CUDA: `supported`


### Commands Setup
```bash
# Prep
apt update
apt install python3.7
apt-get install python3-pip

# System Package
sudo apt install -y git cmake
sudo apt install -y libatlas-base-dev gfortran
sudo apt install -y libhdf5-serial-dev hdf5-tools
## ERROR python.h not found -> Looks like you haven't properly installed the header files and static libraries for python dev. Use your package manager to install them system-wide.
sudo apt install -y python3-dev
sudo apt install -y python3.7-dev

# ALL using python3.7 installed
pip install cmake
pip install testresources
pip install -U setuptools

# CUDA
echo "# Add 64-bit CUDA library & binary paths:" >> ~/.bashrc
echo "export CUBA_HOME=/usr/local/cuda-10.0" >> ~/.bashrc
echo "export PATH=/usr/local/cuda-<cuda_version>/bin:$PATH" >> ~/.bashrc
echo "export
LD_LIBRARY_PATH=/usr/local/cuda-<cuda_version>/lib64:$LD_LIBRARY_PATH" >>
~/.bashrc
$ source ~/.bashrc

# Python Virtual Environment
pip install virtualenv
cd ~
mkdir FRC
cd FRC
virtualenv FRC_ENV
source FRC_ENV/bin/activate



#ref https://devtalk.nvidia.com/default/topic/1049071/pytorch-for-jetson-nano-version-1-3-0-now-available/

# Install py3.6 pytorch + torchvision
NANO接硬盘 
EMMC
# swap memory

# Download, Compile and Install pyTorch
sudo nvpmodel -m 0
~/jetson_clocks.sh

export USE_NCCL=0
$ export USE_DISTRIBUTED=0
$ export TORCH_CUDA_ARCH_LIST="5.3;6.2;7.2"

export PYTORCH_BUILD_VERSION=<version>  # without the leading 'v', e.g. 1.3.0 for PyTorch v1.3.0
$ export PYTORCH_BUILD_NUMBER=1

pip install scikit-build --user
pip install ninja --user
git clone --recursive --branch v<x.x.x> http://github.com/pytorch/pytorch
cd pytorch
pip install -r requirements.txt
python setup.py bdist_wheel

# Install torch precompiled
wget https://nvidia.box.com/shared/static/phqe92v26cbhqjohwtvxorrwnmrnfx1o.whl -O torch-1.3.0-cp36-cp36m-linux_aarch64.whl
pip3 install numpy torch-1.3.0-cp36-cp36m-linux_aarch64.whl
pip install <wheel>

# Install Torchvision
apt-get install libjpeg-dev #zlib1g-dev
git clone --branch v0.4.2 https://github.com/pytorch/vision torchvision
cd torchvision
python setup.py install

# Detectron Prerequisite
ycocotools: pip install cython; pip install 'git+https://github.com/cocodataset/cocoapi.git#subdirectory=PythonAPI'
## opencv
    opencv is pre-installed.
    #for virtualenv
    cp /usr/local/lib/python2.7/dist-packages/cv* ./lib/python2.7/site-packages/

```

# NANO REPO
```bash
# Prereq Lib
## dir: FRC
source activate FRC_DEV36/bin/activate

pip install websockets
pip install configparser
pip install asyncio
pip install schema
pip install pynetworktables
pip install bokeh # -> numpy dependency

git clone -b dev https://cheetahbots8015@dev.azure.com/cheetahbots8015/2020_infinite_recharge/_git/2020_IR_NANO

cd 2020_IR_NANO

python main.py
```
### 问题
- [x] Python SSL


### 步骤
- 
- python环境
- opencv
- 安装pytorch


### linux cmd note
https://www.cnblogs.com/ggjucheng/archive/2013/01/14/2859613.html   
opencv 降采样 average
