//-------------------------------------MQTT功能-----------------------------------

import * as THREE from "./three.module.js";


// 192.168.1.188:18083
// admin public
let userID = "admin"  //这个地方的userID 的作用是什么？
let mqttHost = '192.168.1.188' // ip
let mqttPort = '8083' // 端口
let mqttTimeout = 10000 // 超时
let reconnectAttempts = 5 //重连次数

let IsAllowConnect = true
let mqttConnStatus = false
let mqttClient
// 订阅的信息
let mesClientTopicList = ['ringRollingMachine']
let sendTopicList = {
  NcWork_New: 'NcWork_New',
  NcName: 'NcName/',
  NcNameUUID: 'NcNameUUID'
}
let NcName = 'NC1'
let timeout = null
let connectNum = 0




//创建唯一UID
function makeUid() {
  let text = ""
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678910"
  for (let i = 0; i < 10; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  text = 'ScadaWeb_' + userID + '_' + text
  return text
}
//MQTT-CLIENT连接函数
function StartMqttClient() {
  try {
    //判断是否支持HTML5
    let support = "MozWebSocket" in window ? 'MozWebSocket' : ("WebSocket" in window ? 'WebSocket' : null)
    if (support == null) {
      console.log('NO SUPPORT H5!')
      return
    }
    try {
      clearInterval(timeout)
    } catch (exception) {
      console.log('exception', exception)
    }

    let clientUId = makeUid();
    // let lx = new LiXian()
    mqttClient = new Paho.MQTT.Client(mqttHost, Number(mqttPort), "/mqtt", clientUId);
    let options = {
      invocationContext: { host: mqttHost, port: Number(mqttPort), path: "/mqtt", clientId: clientUId },
      timeout: mqttTimeout,
      keepAliveInterval: 15,
      cleanSession: true,
      useSSL: false,
      onFailure:onFailure,
      onSuccess:onConnected
    };
    mqttClient.connect(options)
    mqttClient.onConnectionLost = onConnectionLost //失去连接事件
    mqttClient.onMessageArrived = onMessageArrived //接受到数据事件
  } catch(error) {
    console.log(error)
  }
}
//MQTT-CLIENT连接失败
function onFailure(e) {
  console.log('连接失败，将进行重连',e)
  if (IsAllowConnect) {
    //重新连接,打开计时器
    timeout = setTimeout(function () {
      if(connectNum > 5) {
        clearInterval(timeout)
        CloseMqttClient()
      } else {
        StartMqttClient()
        connectNum++
      }
    }, 1000)
  }
}

//MQTT-CLIENT关闭函数
function CloseMqttClient() {
  try {
    mqttConnStatus = false;
    if (mqttClient) {
      mqttClient.disconnect();
      console.log('MQTT-CLIENT关闭!')
    }

  } catch {}
}
//失去连接
function onConnectionLost(responseObject) {
  console.log('MQTT失去连接!')
  mqttConnStatus = false
  StartMqttClient()
}
//连接成功
function onConnected(reconnect, uri) {
  mqttConnStatus = true
  //注册监控点
  for (let i = 0; i < mesClientTopicList.length; i++) {
    subscribe(mesClientTopicList[i].toString())
  }

}
//接收到消息
function onMessageArrived(message) {
  try {
      // console.log('messagemessagemessagemessagemessage', message)
      let topic = message.destinationName
      let payload = JSON.parse(message.payloadString)
      // let mg = {topic: topic, payload:payload}
      loadMqttData(topic, payload)
    } catch (err) {
      console.log(err)
    }
}


//发送消息函数功能
function sendMessage(topic, msg) {
  try {
    if (!mqttConnStatus) {
      console.log('请先启动监控');
      return;
    }
    let message = new Paho.MQTT.Message(msg)
    message.destinationName = topic
    message.qos = 0
    message.retained = false
    mqttClient.send(message)
  } catch (err) {
    console.log(err)
  }
}

//订阅主题函数功能
function subscribe(topic) {
  try {
    if (!mqttConnStatus) {
      console.log('请先启动监控!')
      return
    }
    mqttClient.subscribe(topic, { qos: 0 })
  } catch (error){
    console.log(error)
  }
}

//取消订阅主题
function unsubscribe(topic) {
  try {
    if (mqttConnStatus) {
      mqttClient.unsubscribe(topic, {
        invocationContext: { topic: topic }
      })
    }
  } catch {}
}

//接收到消息后进行界面刷新
// function UpdateForm(channel, message) {
//   // console.log(channel, message)
//
//   let arrays_signal = message.split('|')
//   // console.log(msg.data, '协议')
//   let m_SourceType = arrays_signal[0] // 数据类型：DT：数字孪生数据
//   let m_DeviceType = arrays_signal[1] // 设备类型，Robot：机器人类型的设备，Device：普通设备
//   let m_DeviceName = arrays_signal[2] // 数据
//   switch (m_SourceType) {
//     case 'DT':
//       switch (m_DeviceType) {
//         case 'Frames':
//           moverMachine(m_DeviceName)
//           break
//       }
//   }
//   // DT|Frames|[{ "i":"D71997A4-7875-471B-B7DF-4704C7831AFB","tx":0,"ty":7.14,"tz":0,"rx":0,"ry":0,"rz":0}]
//
// }
//
// function moverMachine(moveData) {
//
//   let frameDataPlay = JSON.parse(moveData)
//   if (!frameDataPlay.length) {
//     console.log('无播放数据')
//     return
//   }
//
//   for (let i in frameDataPlay) {
//
//     const position = frameDataPlay[i].i.toString()
//     const objectToMove = moveGroupTo[position]
//     objectToMove.position.set(0, 0, 0)
//     objectToMove.rotation.set(0, 0, 0)
//     objectToMove.updateMatrix()
//     let rotation_matrix = new THREE.Matrix4()
//     rotation_matrix.makeRotationFromEuler(new THREE.Euler(frameDataPlay[i].rx, frameDataPlay[i].ry, frameDataPlay[i].rz))
//     objectToMove.applyMatrix4(rotation_matrix)
//
//
//     if(position === 'E1A90D58-BBDA-4DDF-96D9-F04C20279A03') {
//       console.log(moveData)
//       objectToMove.position.set(frameDataPlay[i].ty / 1000, frameDataPlay[i].tx / 1000, frameDataPlay[i].tz / 1000)
//     }
//     if(position === 'D71997A4-7875-471B-B7DF-4704C7831AFB') {
//       objectToMove.position.set(frameDataPlay[i].ty / 1000, frameDataPlay[i].tx / 1000, frameDataPlay[i].tz / 1000)
//     }
//     if(position === '9876813D-7FD5-4320-B6A8-C94611BE666E') {
//       objectToMove.position.set(frameDataPlay[i].tx / 1000, frameDataPlay[i].ty / 1000, frameDataPlay[i].tz / 1000)
//     }
//     break
//   }
//
//
//
// }

export {
  StartMqttClient, sendMessage
}
// //-------------------------------------MQTT功能-----------------------------------
//
// // import * as THREE from "./three.module.js";
// import {loadMqttData} from "./index.js";
//
// export {
//   MqttServer
// }
// class MqttServer {
//   constructor() {
//     this.userID = "admin"  //这个地方的userID 的作用是什么？
//     this.mqttHost = '192.168.1.188' // ip
//     this.mqttPort = '8083' // 端口
//     this.mqttTimeout = 10000 // 超时
//     this.reconnectAttempts = 5 //重连次数
//     this.IsAllowConnect = true
//     this.mqttConnStatus = false
//     this.mqttClient = null
//     this.mesClientTopicList = ['ringRollingMachine']
//     this.sendTopicList = {
//       NcWork_New: 'NcWork_New',
//       NcName: 'NcName/',
//       NcNameUUID: 'NcNameUUID'
//     }
//     this.NcName = 'NC1'
//     this.timeout = null
//     this.connectNum = 0
//   }
//
// //创建唯一UID
//   makeUid() {
//     let text = ""
//     let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678910"
//     for (let i = 0; i < 10; i++) {
//       text += possible.charAt(Math.floor(Math.random() * possible.length))
//     }
//     text = 'ScadaWeb_' + this.userID + '_' + text
//     return text
//   }
//
// //MQTT-CLIENT连接函数
//   StartMqttClient() {
//     const scope = this
//     try {
//       //判断是否支持HTML5
//       let support = "MozWebSocket" in window ? 'MozWebSocket' : ("WebSocket" in window ? 'WebSocket' : null)
//       if (support == null) {
//         console.log('NO SUPPORT H5!')
//         return
//       }
//       try {
//         clearInterval(scope.timeout)
//       } catch (exception) {
//         console.log('exception', exception)
//       }
//
//       let clientUId = scope.makeUid();
//       // let lx = new LiXian()
//       scope.mqttClient = new Paho.MQTT.Client(scope.mqttHost, Number(scope.mqttPort), "/mqtt", clientUId);
//       let options = {
//         invocationContext: {host: scope.mqttHost, port: Number(scope.mqttPort), path: "/mqtt", clientId: clientUId},
//         timeout: scope.mqttTimeout,
//         keepAliveInterval: 15,
//         cleanSession: true,
//         useSSL: false,
//         onFailure: scope.onFailure,
//         onSuccess: scope.onConnected
//       };
//       scope.mqttClient.connect(options)
//       scope.mqttClient.onConnectionLost = scope.onConnectionLost //失去连接事件
//       scope.mqttClient.onMessageArrived = scope.onMessageArrived //接受到数据事件
//     } catch (error) {
//       console.log(error)
//     }
//   }
//
// //MQTT-CLIENT连接失败
//   onFailure(e) {
//     const scope = this
//     console.log('连接失败，将进行重连', e)
//     if (scope.IsAllowConnect) {
//       //重新连接,打开计时器
//       scope.timeout = setTimeout(function () {
//         if (scope.connectNum > 5) {
//           clearInterval(scope.timeout)
//           scope.CloseMqttClient()
//         } else {
//           scope.StartMqttClient()
//           scope.connectNum++
//         }
//       }, 1000)
//     }
//   }
//
// //MQTT-CLIENT关闭函数
//   CloseMqttClient() {
//
//     try {
//       scope.mqttConnStatus = false;
//       if (this.mqttClient) {
//         this.mqttClient.disconnect();
//         console.log('MQTT-CLIENT关闭!')
//       }
//
//     } catch {
//     }
//   }
//
// //失去连接
//   onConnectionLost(responseObject) {
//     console.log('MQTT失去连接!')
//     this.mqttConnStatus = false
//     this.StartMqttClient()
//   }
//
// //连接成功
//   onConnected(reconnect, uri) {
//     console.log('连接成功')
//     this.mqttConnStatus = true
//     //注册监控点
//     for (let i = 0; i < this.mesClientTopicList.length; i++) {
//       this.subscribe(this.mesClientTopicList[i].toString())
//     }
//
//   }
//
// //接收到消息
//   onMessageArrived(message) {
//     try {
//       // console.log('messagemessagemessagemessagemessage', message)
//       let topic = message.destinationName
//       let payload = JSON.parse(message.payloadString)
//       // let mg = {topic: topic, payload:payload}
//       loadMqttData(topic, payload)
//     } catch (err) {
//       console.log(err)
//     }
//   }
//
//
// //发送消息函数功能
//   sendMessage(topic, msg) {
//     try {
//       if (!this.mqttConnStatus) {
//         console.log('请先启动监控');
//         return;
//       }
//       let message = new Paho.MQTT.Message(msg)
//       message.destinationName = topic
//       message.qos = 0
//       message.retained = false
//       this.mqttClient.send(message)
//     } catch (err) {
//       console.log(err)
//     }
//   }
//
// //订阅主题函数功能
//   subscribe(topic) {
//     try {
//       if (!this.mqttConnStatus) {
//         console.log('请先启动监控!')
//         return
//       }
//       this.mqttClient.subscribe(topic, {qos: 0})
//       console.log('主题订阅成功!')
//     } catch (error) {
//       console.log(error)
//     }
//   }
//
// //取消订阅主题
//   unsubscribe(topic) {
//     try {
//       if (this.mqttConnStatus) {
//         this.mqttClient.unsubscribe(topic, {
//           invocationContext: {topic: topic}
//         })
//       }
//     } catch {
//     }
//   }
// }
//
//
//
