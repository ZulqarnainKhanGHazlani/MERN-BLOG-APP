import React from 'react'
import loadingGif from '../images/loading.gif'
const Loader = () => {
    return (
        <div className='loader'>
            <div className='loader__image'>
                <img src={loadingGif} alt='' />
            </div>
        </div>
    )
}

export default Loader
