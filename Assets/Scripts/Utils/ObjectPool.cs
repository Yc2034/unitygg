using System.Collections.Generic;
using UnityEngine;

namespace RichMan.Utils
{
    /// <summary>
    /// 通用对象池 - 用于重复使用对象，避免频繁创建和销毁
    /// </summary>
    public class ObjectPool<T> where T : Component
    {
        private readonly T _prefab;
        private readonly Transform _parent;
        private readonly Queue<T> _pool;
        private readonly int _initialSize;
        private readonly bool _expandable;

        /// <summary>
        /// 创建对象池
        /// </summary>
        /// <param name="prefab">预制体</param>
        /// <param name="parent">父对象</param>
        /// <param name="initialSize">初始大小</param>
        /// <param name="expandable">是否可扩展</param>
        public ObjectPool(T prefab, Transform parent, int initialSize = 10, bool expandable = true)
        {
            _prefab = prefab;
            _parent = parent;
            _initialSize = initialSize;
            _expandable = expandable;
            _pool = new Queue<T>();

            // 预创建对象
            for (int i = 0; i < _initialSize; i++)
            {
                CreateNewObject();
            }
        }

        private T CreateNewObject()
        {
            T obj = Object.Instantiate(_prefab, _parent);
            obj.gameObject.SetActive(false);
            _pool.Enqueue(obj);
            return obj;
        }

        /// <summary>
        /// 从池中获取对象
        /// </summary>
        public T Get()
        {
            if (_pool.Count == 0)
            {
                if (_expandable)
                {
                    return CreateAndActivate();
                }
                else
                {
                    Debug.LogWarning("Object pool exhausted and not expandable!");
                    return null;
                }
            }

            T obj = _pool.Dequeue();
            obj.gameObject.SetActive(true);
            return obj;
        }

        private T CreateAndActivate()
        {
            T obj = Object.Instantiate(_prefab, _parent);
            obj.gameObject.SetActive(true);
            return obj;
        }

        /// <summary>
        /// 将对象返回池中
        /// </summary>
        public void Return(T obj)
        {
            if (obj == null) return;

            obj.gameObject.SetActive(false);
            _pool.Enqueue(obj);
        }

        /// <summary>
        /// 清空对象池
        /// </summary>
        public void Clear()
        {
            while (_pool.Count > 0)
            {
                T obj = _pool.Dequeue();
                if (obj != null)
                {
                    Object.Destroy(obj.gameObject);
                }
            }
        }

        /// <summary>
        /// 当前池中可用对象数量
        /// </summary>
        public int AvailableCount => _pool.Count;
    }

    /// <summary>
    /// 对象池管理器 - 管理多个对象池
    /// </summary>
    public class PoolManager : Singleton<PoolManager>
    {
        private readonly Dictionary<string, object> _pools = new Dictionary<string, object>();

        /// <summary>
        /// 创建或获取指定类型的对象池
        /// </summary>
        public ObjectPool<T> GetOrCreatePool<T>(string poolName, T prefab, int initialSize = 10) where T : Component
        {
            if (_pools.TryGetValue(poolName, out object pool))
            {
                return pool as ObjectPool<T>;
            }

            Transform poolParent = new GameObject($"Pool_{poolName}").transform;
            poolParent.SetParent(transform);

            ObjectPool<T> newPool = new ObjectPool<T>(prefab, poolParent, initialSize);
            _pools[poolName] = newPool;
            return newPool;
        }

        /// <summary>
        /// 获取指定名称的对象池
        /// </summary>
        public ObjectPool<T> GetPool<T>(string poolName) where T : Component
        {
            if (_pools.TryGetValue(poolName, out object pool))
            {
                return pool as ObjectPool<T>;
            }
            return null;
        }

        /// <summary>
        /// 清除所有对象池
        /// </summary>
        public void ClearAllPools()
        {
            foreach (var pool in _pools.Values)
            {
                // 使用反射调用Clear方法
                var clearMethod = pool.GetType().GetMethod("Clear");
                clearMethod?.Invoke(pool, null);
            }
            _pools.Clear();
        }
    }
}
