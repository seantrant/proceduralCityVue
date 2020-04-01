export class GridSetup {

  constructor(args){
    // this.scene = args.scene // dont need
    this.store = args.store
    this.grid = this.store.getters.getScene.grid
  }

  createNewGrid(){
    return this.addGridContentsToGrid(this.createGridArray())
  }

  createGridArray(){
    let arrayContainingGrids = []
    let currentRow = 0
    let currentColumn = 0
    let gridSize = this.grid.gridSize // must have square root for now
    let totalGrids = gridSize * gridSize
    let count = 1
    for(let i = 0; i < totalGrids; i++){
      let grid = { id: i, coords: { x: currentRow, y: currentColumn }, contents: null} // makde class for grid
      if(count == gridSize-1){
        count = 1
      }
      if(currentRow == gridSize - 1 ){
        currentRow = 0
        currentColumn++
      }else{
        currentRow++
      }
      count++
      arrayContainingGrids.push(grid)
    }
    return arrayContainingGrids
  }

  addGridContentsToGrid(arrayOfGrids){
    return arrayOfGrids.map((grid) => {
      if(this.gridShouldContainBuilding(grid)){
        grid.contents = 'building'
      }else if(this.gridShouldContainJunction(grid)){
        grid.contents = 'junction'
      }else{
        grid.contents = 'road'
      }
      return grid
    })
  }

  // drawGridLayout(arrayOfGrids){
  //   let box
  //   let h = 0.01
  //   arrayOfGrids.forEach((grid) => {
  //     if(grid.contents == 'road'){
  //       box = this.createBox(1, h, 1, 0xD3D3D3, false)
  //     }else if(grid.contents == 'building'){
  //       box = this.createBox(1, h, 1, 0x6a0dad, false)
  //     }else if(grid.contents == 'junction'){
  //       box = this.createBox(1, h, 1, 0x6a0000, false)
  //     }
  //     box.position.set(grid.coords.x, 0.1, grid.coords.y)
  //     this.scene.add(box);
  //   })
  // }

  isOdd(num){
    return num % 2
  }
  gridShouldContainBuilding(grid){
    if(this.isOdd(grid.coords.x) && this.isOdd(grid.coords.y)){
      return true
    }
  }
  gridShouldContainJunction(grid){
    if(!this.isOdd(grid.coords.x) && !this.isOdd(grid.coords.y)){
      return true
    }
  }

}
export default GridSetup
