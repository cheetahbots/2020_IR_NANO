# Introduction 
Codes in this repository is deployed to Nano dev board.
This sub-project serves to define the control strategy for the robot.

# Dependencies

! pip install pynetworktables
! pip install schema

# Structure

1. 控制层
- UI界面，用户交互

2. 策略层
- 控制算法

3. 硬件层
- 向Roborio发送指令

4. 系统
- 占用管理、优先级策略。
- WEB Dashboard

# Todo

- UI
- 通讯
- 模块log, benchmarking
- 模块连接兼容性
- 异常处理


# Todo
- 2W连底盘进行控制测试 1 + 1
    - Websocket
    - 控制能动
    - config工作的
- 一个用来测试电机的module 0.5+0.5 
- Benchmark 方框图+数据的缓存和显示 2+0
    - python不管连接，只管raw data
    - 实时/最后
- 4W吃进每一个配件，写module, mapping通过config 0+2
- CV inf+inf (与刘宏逸同吃同睡)
    - （双目）图像定位 3
    - 找球
    - 瞄准 发射模块
    - 转盘模块
    - 杠杆的平衡调整