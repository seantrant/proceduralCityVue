/**
 * Contains functionaliy concerning user inputs. To be broken up further once more inputs are created, keyboard clicks etc..
 */
export class UserInput {

  constructor(args){
    this.camera = args.camera
  }

  loadEventListeners(res){

    // window.addEventListener("wheel", event => {
    //   let delta = Math.sign(event.deltaY);
    //   this.updateFov(delta);
    // });

    // window.addEventListener('auxclick', function(event) {
    //   console.log("middle button clicked", event);
    // })

    // window.addEventListener('mousedown', function(event) {
    //   // console.log("middle button down", event, event.button);
    //   if(event.button === 1){
    //     this.middleMouseDown = true;
    //   }
    // })
    //
    // window.addEventListener('mouseup', function(event) {
    //   // console.log("middle button up", event, event.button);
    //   if(event.button === 1){
    //     this.middleMouseDown = false;
    //   }
    // })

    window.addEventListener('keydown', (event) => {
      let x =  this.camera.position.x
      let z =  this.camera.position.z
      let y = 4.5
      if(event.keyCode === 37){ // left
        this.camera.position.set( x, y, z + 0.1)
      }
      if(event.keyCode === 38){ // up
        this.camera.position.set( x - 0.1, y, z)
      }
      if(event.keyCode === 39){ // right
        this.camera.position.set( x, y, z - 0.1)
      }
      if(event.keyCode === 40){ // down
        this.camera.position.set( x + 0.1, y, z)
      }
      res(this.camera)
    })

  }

}
export default UserInput;
