using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;

namespace RichMan.Audio
{
    /// <summary>
    /// 音频管理器 - 管理游戏所有音频播放
    /// </summary>
    public class AudioManager : Singleton<AudioManager>
    {
        [Header("音频源")]
        [SerializeField] private AudioSource _bgmSource;
        [SerializeField] private AudioSource _sfxSource;
        [SerializeField] private int _sfxPoolSize = 5;

        [Header("音量设置")]
        [Range(0f, 1f)]
        [SerializeField] private float _masterVolume = 1f;
        [Range(0f, 1f)]
        [SerializeField] private float _bgmVolume = 0.8f;
        [Range(0f, 1f)]
        [SerializeField] private float _sfxVolume = 1f;

        [Header("BGM剪辑")]
        [SerializeField] private AudioClip _mainMenuBGM;
        [SerializeField] private AudioClip _gameBGM;
        [SerializeField] private AudioClip _victoryBGM;

        [Header("SFX剪辑")]
        [SerializeField] private AudioClip _diceRollSFX;
        [SerializeField] private AudioClip _diceResultSFX;
        [SerializeField] private AudioClip _coinSFX;
        [SerializeField] private AudioClip _purchaseSFX;
        [SerializeField] private AudioClip _upgradeSFX;
        [SerializeField] private AudioClip _buttonClickSFX;
        [SerializeField] private AudioClip _cardUseSFX;
        [SerializeField] private AudioClip _moveSFX;

        // SFX对象池
        private List<AudioSource> _sfxPool = new List<AudioSource>();
        private int _currentSfxIndex = 0;

        protected override void OnSingletonAwake()
        {
            InitializeAudioSources();
            LoadVolumeSettings();
        }

        private void InitializeAudioSources()
        {
            // 创建BGM音频源
            if (_bgmSource == null)
            {
                GameObject bgmObj = new GameObject("BGM_Source");
                bgmObj.transform.SetParent(transform);
                _bgmSource = bgmObj.AddComponent<AudioSource>();
                _bgmSource.loop = true;
                _bgmSource.playOnAwake = false;
            }

            // 创建SFX对象池
            for (int i = 0; i < _sfxPoolSize; i++)
            {
                GameObject sfxObj = new GameObject($"SFX_Source_{i}");
                sfxObj.transform.SetParent(transform);
                AudioSource source = sfxObj.AddComponent<AudioSource>();
                source.playOnAwake = false;
                _sfxPool.Add(source);
            }

            if (_sfxSource == null && _sfxPool.Count > 0)
            {
                _sfxSource = _sfxPool[0];
            }
        }

        private void LoadVolumeSettings()
        {
            _bgmVolume = PlayerPrefs.GetFloat(Constants.PrefKeyBGMVolume, 0.8f);
            _sfxVolume = PlayerPrefs.GetFloat(Constants.PrefKeySFXVolume, 1f);
            ApplyVolumeSettings();
        }

        private void ApplyVolumeSettings()
        {
            if (_bgmSource != null)
            {
                _bgmSource.volume = _bgmVolume * _masterVolume;
            }
        }

        #region 音量控制

        /// <summary>
        /// 设置主音量
        /// </summary>
        public void SetMasterVolume(float volume)
        {
            _masterVolume = Mathf.Clamp01(volume);
            ApplyVolumeSettings();
        }

        /// <summary>
        /// 设置BGM音量
        /// </summary>
        public void SetBGMVolume(float volume)
        {
            _bgmVolume = Mathf.Clamp01(volume);
            PlayerPrefs.SetFloat(Constants.PrefKeyBGMVolume, _bgmVolume);
            ApplyVolumeSettings();
        }

        /// <summary>
        /// 设置SFX音量
        /// </summary>
        public void SetSFXVolume(float volume)
        {
            _sfxVolume = Mathf.Clamp01(volume);
            PlayerPrefs.SetFloat(Constants.PrefKeySFXVolume, _sfxVolume);
        }

        public float MasterVolume => _masterVolume;
        public float BGMVolume => _bgmVolume;
        public float SFXVolume => _sfxVolume;

        #endregion

        #region BGM控制

        /// <summary>
        /// 播放BGM
        /// </summary>
        public void PlayBGM(AudioClip clip, bool fadeIn = true)
        {
            if (_bgmSource == null || clip == null) return;

            if (_bgmSource.clip == clip && _bgmSource.isPlaying)
            {
                return; // 已经在播放相同的BGM
            }

            _bgmSource.clip = clip;
            _bgmSource.volume = _bgmVolume * _masterVolume;
            _bgmSource.Play();
        }

        /// <summary>
        /// 播放主菜单BGM
        /// </summary>
        public void PlayMainMenuBGM()
        {
            PlayBGM(_mainMenuBGM);
        }

        /// <summary>
        /// 播放游戏BGM
        /// </summary>
        public void PlayGameBGM()
        {
            PlayBGM(_gameBGM);
        }

        /// <summary>
        /// 播放胜利BGM
        /// </summary>
        public void PlayVictoryBGM()
        {
            PlayBGM(_victoryBGM);
        }

        /// <summary>
        /// 停止BGM
        /// </summary>
        public void StopBGM()
        {
            if (_bgmSource != null)
            {
                _bgmSource.Stop();
            }
        }

        /// <summary>
        /// 暂停BGM
        /// </summary>
        public void PauseBGM()
        {
            if (_bgmSource != null)
            {
                _bgmSource.Pause();
            }
        }

        /// <summary>
        /// 恢复BGM
        /// </summary>
        public void ResumeBGM()
        {
            if (_bgmSource != null)
            {
                _bgmSource.UnPause();
            }
        }

        #endregion

        #region SFX控制

        /// <summary>
        /// 播放音效
        /// </summary>
        public void PlaySFX(AudioClip clip, float volumeScale = 1f)
        {
            if (clip == null) return;

            AudioSource source = GetAvailableSFXSource();
            if (source != null)
            {
                source.clip = clip;
                source.volume = _sfxVolume * _masterVolume * volumeScale;
                source.Play();
            }
        }

        private AudioSource GetAvailableSFXSource()
        {
            // 使用轮询方式获取音频源
            AudioSource source = _sfxPool[_currentSfxIndex];
            _currentSfxIndex = (_currentSfxIndex + 1) % _sfxPool.Count;
            return source;
        }

        // 便捷方法
        public void PlayDiceRoll() => PlaySFX(_diceRollSFX);
        public void PlayDiceResult() => PlaySFX(_diceResultSFX);
        public void PlayCoin() => PlaySFX(_coinSFX);
        public void PlayPurchase() => PlaySFX(_purchaseSFX);
        public void PlayUpgrade() => PlaySFX(_upgradeSFX);
        public void PlayButtonClick() => PlaySFX(_buttonClickSFX);
        public void PlayCardUse() => PlaySFX(_cardUseSFX);
        public void PlayMove() => PlaySFX(_moveSFX);

        #endregion

        #region 3D音效

        /// <summary>
        /// 在指定位置播放音效
        /// </summary>
        public void PlaySFXAtPosition(AudioClip clip, Vector3 position, float volumeScale = 1f)
        {
            if (clip == null) return;

            AudioSource.PlayClipAtPoint(clip, position, _sfxVolume * _masterVolume * volumeScale);
        }

        #endregion
    }
}
