export class GridSetup {

  constructor(args){
    // this.scene = args.scene // dont need
    this.store = args.store
  }

  getGridConfig(){
    const scene = this.store && this.store.state && this.store.state.sceneView
    const grid = scene && scene.grid ? scene.grid : {}
    return {
      gridSize: typeof grid.gridSize === 'number' ? grid.gridSize : 8,
      spacing: typeof grid.spacing === 'number' ? grid.spacing : 1,
    }
  }

  createNewGrid(){
    return this.addGridContentsToGrid(this.createGridArray())
  }

  createGridArray(){
    let arrayContainingGrids = []
    let currentRow = 0
    let currentColumn = 0
    let gridSize = this.getGridConfig().gridSize // must have square root for now
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
